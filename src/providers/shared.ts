/**
 * Shared JavaScript snippets for page-context execution.
 *
 * These are STABLE interaction patterns that rarely change when platforms
 * update their UI. They get prepended/composed into provider scripts.
 *
 * IMPORTANT: All top-level declarations MUST use `var` (not `const`/`let`)
 * because executeJavaScript runs in V8's global script scope. If inject
 * declares `const __findFirst` and then send also declares `const __findFirst`
 * on the SAME page, the second call throws:
 *   SyntaxError: Identifier '__findFirst' has already been declared
 * Using `var` allows safe re-declaration across multiple executeJavaScript calls.
 *
 * Convention: Each snippet defines helper functions prefixed with __
 * to avoid collisions with page-level code.
 */

// ─── DOM Utilities ───────────────────────────────────────────────

/** Wait for an element to appear using MutationObserver. */
export const JS_WAIT_FOR_ELEMENT = `
var __waitForElement = (selector, options = {}) => {
  const { timeout = 10000, checkFn = null } = options;
  return new Promise((resolve, reject) => {
    const check = (el) => el && (!checkFn || checkFn(el));
    const existing = document.getElementById(selector) || document.querySelector(selector);
    if (check(existing)) { resolve(existing); return; }

    const observer = new MutationObserver(() => {
      const el = document.getElementById(selector) || document.querySelector(selector);
      if (check(el)) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class', 'id']
    });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Element ' + selector + ' not found within ' + timeout + 'ms'));
    }, timeout);
  });
};
`;

/** Search through shadow roots recursively. */
export const JS_FIND_DEEP = `
var __findDeep = (selector, root = document) => {
  const el = root.querySelector?.(selector);
  if (el) return el;
  const all = root.querySelectorAll?.('*') || [];
  for (const elem of all) {
    if (elem.shadowRoot) {
      const found = __findDeep(selector, elem.shadowRoot);
      if (found) return found;
    }
  }
  return null;
};
`;

/** Try multiple selectors in order, return first match. */
export const JS_FIND_FIRST = `
var __findFirst = (selectors, root = document) => {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
};
`;

/** Try multiple selectors in order with deep shadow DOM search. */
export const JS_FIND_FIRST_DEEP = `
var __findFirstDeep = (selectors) => {
  for (const sel of selectors) {
    let el = document.querySelector(sel);
    if (el) return el;
    el = __findDeep(sel);
    if (el) return el;
  }
  return null;
};
`;

// ─── Input Strategies ────────────────────────────────────────────

/** Set textarea value bypassing React's synthetic event system. */
export const JS_SET_TEXTAREA_VALUE = `
var __setTextareaValue = (el, text) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;
  if (setter) setter.call(el, text);
  else el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
`;

/**
 * Inject text into a contenteditable element via execCommand.
 * Works for Quill, Google's editors, and generic contenteditable fields.
 * This goes through the browser's editing pipeline, triggering proper
 * framework event handlers.
 */
export const JS_EXEC_COMMAND_INSERT = `
var __execCommandInsert = (el, text) => {
  el.click();
  el.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(el);
  document.execCommand('delete', false);
  document.execCommand('insertText', false, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
`;

/** Async sleep utility. */
export const JS_WAIT = `var __wait = (ms) => new Promise(r => setTimeout(r, ms));`;

// ─── Button Click Helpers ────────────────────────────────────────

/** Click the first matching visible button from a list of selectors. */
export const JS_CLICK_FIRST_BUTTON = `
var __clickFirstButton = (selectors) => {
  for (const sel of selectors) {
    const btn = document.querySelector(sel);
    if (btn) {
      btn.focus();
      btn.disabled = false;
      btn.click();
      return btn;
    }
  }
  return null;
};
`;

/** Simulate Enter key press on an element. */
export const JS_SIMULATE_ENTER = `
var __simulateEnter = (el, options = {}) => {
  if (!el) return false;
  el.focus();
  const evtOpts = {
    key: 'Enter', code: 'Enter', keyCode: 13,
    bubbles: true, cancelable: true,
    ...options
  };
  el.dispatchEvent(new KeyboardEvent('keydown', evtOpts));
  el.dispatchEvent(new KeyboardEvent('keypress', evtOpts));
  el.dispatchEvent(new KeyboardEvent('keyup', evtOpts));
  return true;
};
`;

// ─── File Drop Helpers ───────────────────────────────────────────

/** Base64 decode and File creation helpers. */
export const JS_FILE_HELPERS = `
var __decodeBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
var __createFile = (file) => {
  const bytes = __decodeBase64(file.data);
  return new File([bytes], file.name || 'dropped-file', {
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified || Date.now(),
  });
};
var __createFiles = (files) => files.map(__createFile);
`;

/** Assign files to an <input type="file"> element. */
export const JS_FILE_INPUT_ASSIGN = `
var __assignToFileInput = async (input, generatedFiles) => {
  const dt = new DataTransfer();
  generatedFiles.forEach(f => dt.items.add(f));
  try {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    if (desc?.set) desc.set.call(input, dt.files);
    else Object.defineProperty(input, 'files', { configurable: true, value: dt.files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (e) {
    console.warn('[LLM-God] File input assignment failed:', e);
    return false;
  }
};
`;

/** Generic drag-and-drop simulation. */
export const JS_SIMULATE_DND = `
var __simulateDnD = async (target, generatedFiles, options = {}) => {
  if (!target) { console.error('[LLM-God] No drop target'); return false; }
  const { preventDefaults = true } = options;
  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  var handlers = new Map();
  if (preventDefaults) {
    var handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) try { e.dataTransfer.dropEffect = 'copy'; } catch {}
    };
    ['dragenter', 'dragover'].forEach(type => {
      handlers.set(type, handler);
      target.addEventListener(type, handler, { capture: true });
      document.addEventListener(type, handler, { capture: true });
    });
  }

  var buildDT = () => {
    const dt = new DataTransfer();
    generatedFiles.forEach(f => dt.items.add(f));
    try { Object.defineProperty(dt, 'types', { value: ['Files'] }); } catch {}
    try { dt.effectAllowed = 'all'; } catch {}
    return dt;
  };
  var mk = (type) => {
    const dt = buildDT();
    if (type === 'dragover' || type === 'drop') try { dt.dropEffect = 'copy'; } catch {}
    const ev = new DragEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      dataTransfer: dt, clientX: x, clientY: y, view: window
    });
    try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch {}
    return ev;
  };

  document.dispatchEvent(mk('dragenter')); await __wait(30);
  target.dispatchEvent(mk('dragenter'));   await __wait(30);
  for (let i = 0; i < 5; i++) {
    document.dispatchEvent(mk('dragover')); await __wait(20);
    target.dispatchEvent(mk('dragover'));   await __wait(20);
  }
  target.dispatchEvent(mk('drop'));                await __wait(100);
  target.dispatchEvent(mk('dragend'));
  document.dispatchEvent(mk('dragend'));           await __wait(100);
  target.dispatchEvent(new Event('dragleave', { bubbles: true }));
  document.dispatchEvent(new Event('dragleave', { bubbles: true }));

  handlers.forEach((h, type) => {
    target.removeEventListener(type, h, { capture: true });
    document.removeEventListener(type, h, { capture: true });
  });
  return true;
};
`;

// ─── Compose Helpers ─────────────────────────────────────────────

/** Combine multiple JS snippet strings into one. */
export function compose(...snippets: string[]): string {
  return snippets.join('\n');
}
