import { BrowserWindow, WebPreferences, WebContentsView } from "electron"; // Added WebPreferences type
import { applyCustomStyles } from "./customStyles.js";
import { DEVTOOLS_AUTO_OPEN } from "./config.js";

interface CustomBrowserView extends WebContentsView {
  id?: string; // Make id optional as it's assigned after creation
}

// Control whether to auto-open DevTools on startup.
// Edit src/config.ts (DEVTOOLS_AUTO_OPEN) for build-time control.
// Or set env var ELECTRON_OPEN_DEVTOOLS_ON_STARTUP=true (runtime override).
const OPEN_DEVTOOLS_ON_STARTUP =
  DEVTOOLS_AUTO_OPEN ||
  (process.env.ELECTRON_OPEN_DEVTOOLS_ON_STARTUP ?? "").toLowerCase() ===
  "true" ||
  (process.env.SHOW_DEVTOOLS ?? "").toLowerCase() === "true";

export function ensureDetachedDevTools(view: CustomBrowserView): void {
  // If disabled, do nothing so DevTools can be opened manually later.
  if (!OPEN_DEVTOOLS_ON_STARTUP) return;

  const devToolsEvents = [
    "did-finish-load",
    "dom-ready",
    "did-frame-finish-load",
  ] as const;

  let devToolsRetryInterval: NodeJS.Timeout | undefined;

  const startDevToolsRetryInterval = () => {
    if (!devToolsRetryInterval) {
      devToolsRetryInterval = setInterval(() => {
        attemptOpenDevTools();
      }, 1000);
    }
  };

  const stopDevToolsRetryInterval = () => {
    if (devToolsRetryInterval) {
      clearInterval(devToolsRetryInterval);
      devToolsRetryInterval = undefined;
    }
  };

  const attemptOpenDevTools = () => {
    if (view.webContents.isDestroyed()) {
      stopDevToolsRetryInterval();
      return;
    }

    if (view.webContents.isDevToolsOpened()) {
      stopDevToolsRetryInterval();
      return;
    }

    startDevToolsRetryInterval();

    try {
      view.webContents.openDevTools({ mode: "detach" });
    } catch (error) {
      console.warn("Failed to open devtools for view", view.id, error);
    }
  };

  const handleLifecycleEvent = () => {
    attemptOpenDevTools();
  };

  const handleDevToolsOpened = () => {
    stopDevToolsRetryInterval();
  };

  const handleDevToolsClosed = () => {
    startDevToolsRetryInterval();
    attemptOpenDevTools();
  };

  devToolsEvents.forEach((event) => {
    view.webContents.on(event as unknown as any, handleLifecycleEvent);
  });

  view.webContents.on("devtools-opened", handleDevToolsOpened);
  view.webContents.on("devtools-closed", handleDevToolsClosed);

  view.webContents.once("destroyed", () => {
    devToolsEvents.forEach((event) => {
      view.webContents.removeListener(
        event as unknown as any,
        handleLifecycleEvent as unknown as (...args: unknown[]) => void,
      );
    });
    view.webContents.removeListener("devtools-opened", handleDevToolsOpened);
    view.webContents.removeListener("devtools-closed", handleDevToolsClosed);
    stopDevToolsRetryInterval();
  });

  attemptOpenDevTools();
}

export interface SerializedFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  data: string;
}

/**
 * Creates and configures a new BrowserView for the main window
 * @param mainWindow - The main Electron window
 * @param url - The URL to load in the browser view
 * @param websites - Array of currently open website URLs
 * @param views - Array of currently open BrowserViews
 * @param webPreferences - Optional web preferences for the BrowserView
 * @returns The newly created BrowserView
 */
export function addBrowserView(
  mainWindow: BrowserWindow,
  url: string,
  websites: string[],
  views: CustomBrowserView[],
  options: { webPreferences?: WebPreferences; promptAreaHeight?: number; sidebarWidth?: number } = {},
): CustomBrowserView {
  const { webPreferences = {}, promptAreaHeight = 0, sidebarWidth = 0 } = options;

  const view: CustomBrowserView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      ...webPreferences,
    },
  });

  view.id = url;
  mainWindow.contentView.addChildView(view);

  const { width, height } = mainWindow.getContentBounds();
  const availableHeight = Math.max(height - promptAreaHeight, 0);
  const offset = Math.ceil(Math.max(0, sidebarWidth));

  websites.push(url);
  const availableWidth = Math.max(width - offset, 0);
  const viewWidth = Math.floor(availableWidth / websites.length);

  views.forEach((v, index) => {
    v.setBounds({
      x: offset + index * viewWidth,
      y: 0,
      width: viewWidth,
      height: availableHeight,
    });
  });

  view.setBounds({
    x: offset + (websites.length - 1) * viewWidth,
    y: 0,
    width: viewWidth,
    height: availableHeight,
  });

  view.webContents.setZoomFactor(1.5);
  applyCustomStyles(view.webContents);
  view.webContents.loadURL(url);

  ensureDetachedDevTools(view);

  views.push(view);
  return view;
}

export function removeBrowserView(
  mainWindow: BrowserWindow,
  viewToRemove: CustomBrowserView, // Changed to viewToRemove for clarity
  websites: string[],
  views: CustomBrowserView[],
  options: { promptAreaHeight?: number; sidebarWidth?: number } = {},
): void {
  const { promptAreaHeight = 0, sidebarWidth = 0 } = options;

  const viewIndex = views.indexOf(viewToRemove);
  if (viewIndex === -1) return;

  mainWindow.contentView.removeChildView(viewToRemove);

  const urlIndex = websites.findIndex((url) => url === viewToRemove.id);
  if (urlIndex !== -1) {
    websites.splice(urlIndex, 1);
  }

  views.splice(viewIndex, 1);

  if (views.length === 0) return;

  const { width, height } = mainWindow.getContentBounds();
  const availableHeight = Math.max(height - promptAreaHeight, 0);
  const offset = Math.ceil(Math.max(0, sidebarWidth));
  const availableWidth = Math.max(width - offset, 0);
  const viewWidth = Math.floor(availableWidth / views.length);

  views.forEach((v, index) => {
    v.setBounds({
      x: offset + index * viewWidth,
      y: 0,
      width: viewWidth,
      height: availableHeight,
    });
  });
}

export function injectPromptIntoView(
  view: CustomBrowserView,
  prompt: string,
): void {
  if (view.id && view.id.match("chatgpt")) {
    view.webContents.executeJavaScript(`
      ((prompt) => {
        const inputElement = document.querySelector('#prompt-textarea > p');
        if (inputElement) {
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.innerText = prompt;
          inputElement.dispatchEvent(inputEvent);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("gemini")) {
    // Focus the webContents first so the page thinks it's active
    view.webContents.focus();
    view.webContents.executeJavaScript(`
      ((prompt) => {
        const inputElement = document.querySelector('.ql-editor.textarea') 
            || document.querySelector('div[aria-label="Enter a prompt for Gemini"]')
            || document.querySelector('div[role="textbox"]');
        if (inputElement) {
          // Click and focus the editor so Quill activates
          inputElement.click();
          inputElement.focus();
          
          // Select all existing content then delete it
          const sel = window.getSelection();
          sel.selectAllChildren(inputElement);
          document.execCommand('delete', false);
          
          // Insert text via execCommand which goes through browser editing pipeline
          // This triggers Quill's internal event handlers properly
          document.execCommand('insertText', false, prompt);
          
          // Also dispatch input event as backup
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          
          console.log('[Gemini] Prompt injected via execCommand (follow-up safe)');
        } else {
          console.error('[Gemini] Editor element not found');
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("perplexity")) {
    view.webContents.executeJavaScript(`
      (async (prompt) => {
        const waitForElement = (selector, checkFn = null, timeout = 10000) => {
          return new Promise((resolve, reject) => {
            // Check if already exists
            const existing = document.getElementById(selector) || document.querySelector(selector);
            if (existing && (!checkFn || checkFn(existing))) {
              resolve(existing);
              return;
            }

            // Use MutationObserver to watch for changes
            const observer = new MutationObserver((mutations, obs) => {
              const element = document.getElementById(selector) || document.querySelector(selector);
              if (element && (!checkFn || checkFn(element))) {
                obs.disconnect();
                resolve(element);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['class', 'id']
            });

            // Timeout fallback
            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found within timeout'));
            }, timeout);
          });
        };

        try {
          console.log('[Perplexity] Waiting for editor...');
          
          // Wait for editor with Lexical check
          const editorElement = await waitForElement(
            'ask-input',
            (el) => el.__lexicalEditor || el.tagName === 'TEXTAREA'
          );

          console.log('[Perplexity] Editor ready!');

          if (editorElement && editorElement.__lexicalEditor) {
            const editor = editorElement.__lexicalEditor;
            console.log('[Perplexity] Using Lexical editor');

            editor.focus();
            const newState = {
              root: {
                children: [
                  {
                    children: [
                      {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: prompt,
                        type: 'text',
                        version: 1,
                      },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1,
              },
            };
            const editorState = editor.parseEditorState(JSON.stringify(newState));
            editor.setEditorState(editorState);
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', '');
            const targetElement = editorElement.querySelector('[role="textbox"]') || editorElement;
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer,
              bubbles: true,
              cancelable: true,
              composed: true,
            });
            targetElement.dispatchEvent(pasteEvent);
          } else if (editorElement) {
            console.log('[Perplexity] Using textarea fallback');
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              'value',
            )?.set;
            nativeTextAreaValueSetter?.call(editorElement, prompt);
            const event = new Event('input', { bubbles: true });
            editorElement.dispatchEvent(event);
          }
        } catch (error) {
          console.error('[Perplexity] Failed to inject prompt:', error);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("claude")) {
    view.webContents.executeJavaScript(`
      (async (prompt) => {
        const waitForElement = (selector, timeout = 10000) => {
          return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) {
              resolve(existing);
              return;
            }

            const observer = new MutationObserver((mutations, obs) => {
              const element = document.querySelector(selector);
              if (element) {
                obs.disconnect();
                resolve(element);
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found within timeout'));
            }, timeout);
          });
        };

        try {
          console.log('[Claude] Waiting for editor...');
          const inputElement = await waitForElement('div.ProseMirror');
          console.log('[Claude] Editor ready!');
          
          inputElement.innerHTML = prompt;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) {
          console.error('[Claude] Failed to inject prompt:', error);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("grok")) {
    view.webContents.executeJavaScript(`
      ((prompt) => {
        const inputElement = document.querySelector('textarea');
        if (inputElement) {
          const span = inputElement.previousElementSibling;
          if (span) {
            span.classList.add('hidden');
          }
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          nativeTextAreaValueSetter?.call(inputElement, prompt);
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(inputEvent);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("deepseek")) {
    view.webContents.executeJavaScript(`
      ((prompt) => {
        const inputElement = document.querySelector('textarea');
        if (inputElement) {
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          nativeTextAreaValueSetter?.call(inputElement, prompt);
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(inputEvent);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("lmarena")) {
    view.webContents.executeJavaScript(`
      ((prompt) => {
        const inputElement = document.querySelector('textarea');
        if (inputElement) {
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set;
          nativeTextAreaValueSetter?.call(inputElement, prompt);
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(inputEvent);
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("google.com") && !view.id.match("gemini.google.com")) {
    // Google AI Mode: Inject into search textarea using execCommand for follow-up support
    view.webContents.focus();
    view.webContents.executeJavaScript(`
      ((prompt) => {
        // Try multiple selectors for Google AI Mode's input
        const textarea = document.querySelector('textarea[aria-label="Ask anything"]') 
                      || document.querySelector('textarea[name="q"]') 
                      || document.querySelector('textarea[aria-label*="Search"]')
                      || document.querySelector('input[name="q"]')
                      || document.querySelector('textarea');
        if (textarea) {
          // Click and focus the textarea first
          textarea.click();
          textarea.focus();
          
          // Select all existing content, then replace with new text
          // This ensures old text is cleared even in framework-managed state
          document.execCommand('selectAll', false);
          document.execCommand('insertText', false, prompt);
          
          console.log('[Google AI] Prompt injected (follow-up safe)');
        } else {
          console.error('[Google AI] Search input not found');
        }
      })(${JSON.stringify(prompt)});
    `);
  } else if (view.id && view.id.match("reddit.com")) {
    // Focus the webContents first
    view.webContents.focus();
    view.webContents.executeJavaScript(`
      (async (prompt) => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        
        // Helper to search through shadow roots
        const findDeep = (selector, root = document) => {
          const el = root.querySelector?.(selector);
          if (el) return el;
          const all = root.querySelectorAll?.('*') || [];
          for (const elem of all) {
            if (elem.shadowRoot) {
              const found = findDeep(selector, elem.shadowRoot);
              if (found) return found;
            }
          }
          return null;
        };
        
        // Try to find the input with multiple strategies
        const findInput = () => {
          const selectors = [
            'textarea#innerTextArea',
            '#innerTextArea',
            'guides-search-input-base textarea',
            'guides-search-input-base input',
            'faceplate-textarea-input textarea',
            'faceplate-textarea-input input',
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="ask"]',
            'textarea[placeholder*="Search"]',
            'input[type="search"]',
            'input[name="q"]',
            '[data-testid="search-input"]',
            'textarea',
            'input[type="text"]'
          ];
          
          for (const sel of selectors) {
            let el = document.querySelector(sel);
            if (el) return el;
            el = findDeep(sel);
            if (el) return el;
          }
          return null;
        };
        
        // Wait for element to appear (Reddit loads dynamically)
        let input = null;
        for (let i = 0; i < 20; i++) {
          input = findInput();
          if (input) break;
          await wait(250);
        }
        
        if (input) {
          // Focus and click the input to activate it
          input.click();
          input.focus();
          
          // Select all existing content  
          input.select?.();
          
          // Use execCommand to insert text through the browser editing pipeline
          // This triggers React/framework state updates properly
          document.execCommand('selectAll', false);
          document.execCommand('insertText', false, prompt);
          
          console.log('[Reddit] Prompt injected:', input.tagName, input.id || '', input.placeholder || '');
        } else {
          console.error('[Reddit] Search input not found after waiting');
        }
      })(${JSON.stringify(prompt)});
    `);
  }
}

export async function simulateFileDropInView(
  view: CustomBrowserView,
  files: SerializedFile[],
): Promise<void> {
  if (!files.length) return;

  const script = `
    (async (files) => {
      try {
        const decodeBase64 = (base64) => {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        };

        const createFile = (file) => {
          const bytes = decodeBase64(file.data);
          return new File([bytes], file.name || "dropped-file", {
            type: file.type || "application/octet-stream",
            lastModified: file.lastModified || Date.now(),
          });
        };

        const generatedFiles = files.map(createFile);
        const hostname = location.hostname;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // ---------------------------
        // GEMINI-ONLY (de-duped + single-dispatch)
        // ---------------------------
        if (hostname.includes('gemini.google.com')) {
          const sig = generatedFiles.map(f => \`\${f.name}:\${f.size}:\${f.lastModified}\`).join('|');
          const now = Date.now();
          const lockKey = '__LLM_GOD_GEMINI_LOCK__';

          // simple in-tab de-dupe (5s window)
          try {
            const lock = window[lockKey];
            if (lock && lock.sig === sig && (now - lock.ts) < 5000) {
              console.log('[LLM-God] Gemini: duplicate attempt suppressed');
              return true;
            }
            window[lockKey] = { sig, ts: now };
            setTimeout(() => {
              const l = window[lockKey];
              if (l && l.sig === sig) l.ts = 0;
            }, 6000);
          } catch {}

          console.log('[LLM-God] Gemini path: input -> paste -> DnD');

          // Build one DataTransfer reused across strategies.
          const dt = new DataTransfer();
          generatedFiles.forEach(f => dt.items.add(f));

          // Many Google uploaders call webkitGetAsEntry()
          for (const item of dt.items) {
            if (!('webkitGetAsEntry' in item)) {
              try {
                Object.defineProperty(item, 'webkitGetAsEntry', {
                  value: () => ({
                    isFile: true,
                    isDirectory: false,
                    file: (cb) => cb(item.getAsFile()),
                    name: item.getAsFile()?.name || 'file',
                  }),
                  configurable: true,
                });
              } catch {}
            }
          }

          // Deep/shadow/iframe search for <input type="file">
          const enumerateRoots = () => {
            const roots = [document];
            const seen = new Set();
            const push = (root) => {
              if (!root || seen.has(root)) return;
              seen.add(root);
              roots.push(root);
              const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
              let n;
              while ((n = walker.nextNode())) {
                const el = n;
                if (el.shadowRoot) push(el.shadowRoot);
                if (el.tagName === 'IFRAME') {
                  try { if (el.contentDocument) push(el.contentDocument); } catch {}
                }
              }
            };
            push(document);
            return roots;
          };

          const findAnyFileInput = () => {
            for (const root of enumerateRoots()) {
              const q = root.querySelector?.('input[type="file"]');
              if (q) return q;
            }
            return null;
          };

          // 1) Prefer file input assignment (dispatch ONLY 'change')
          const deadline = Date.now() + 5000;
          let input = findAnyFileInput();
          while (!input && Date.now() < deadline) {
            await wait(120);
            input = findAnyFileInput();
          }
          if (input) {
            console.log('[LLM-God] Gemini: file input found, assigning files (change only)');
            try {
              const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
              if (desc?.set) desc.set.call(input, dt.files);
              else Object.defineProperty(input, 'files', { configurable: true, value: dt.files });

              // IMPORTANT: trigger only 'change' to avoid double handlers
              input.dispatchEvent(new Event('change', { bubbles: true }));
              await wait(150);
              console.log('[LLM-God] ✓ Gemini upload via input (single change)');
              return true;
            } catch (e) {
              console.warn('[LLM-God] Gemini input assignment failed, trying paste:', e);
            }
          }

          // 2) Paste fallback (dispatch to a single deepest target)
          const pasteTargets = [
            document.querySelector('[contenteditable="true"]'),
            document.querySelector('.ql-editor.textarea'),
            document.querySelector('[role="textbox"]'),
          ].filter(Boolean);
          const targetForPaste = pasteTargets[0] || document.activeElement || document.querySelector('form') || document.body;

          const dispatchPaste = (el) => {
            if (!el) return false;
            try { el.focus?.(); } catch {}
            let ev;
            try {
              ev = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt,
              });
            } catch {
              ev = new Event('paste', { bubbles: true, cancelable: true });
            }
            try { Object.defineProperty(ev, 'clipboardData', { value: dt }); } catch {}
            return el.dispatchEvent(ev);
          };

          if (dispatchPaste(targetForPaste)) {
            console.log('[LLM-God] ✓ Gemini paste dispatched (single target)');
            return true;
          }

          // 3) Last resort: DnD with dragover cancellation
          const pickGeminiDropTarget = () =>
            document.querySelector('form')
            || document.querySelector('[contenteditable="true"]')
            || document.querySelector('.ql-editor.textarea')
            || document.body;

          const target = pickGeminiDropTarget();
          if (!target) {
            console.error('[LLM-God] Gemini: no drop target found');
            return false;
          }

          const preventDragover = (e) => {
            e.preventDefault();
            if (e.dataTransfer) { try { e.dataTransfer.dropEffect = 'copy'; } catch {} }
          };
          document.addEventListener('dragover', preventDragover, { capture: true });
          target.addEventListener('dragover', preventDragover, { capture: true });

          const rect = target.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          const mk = (type) => {
            const ev = new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              clientX: x,
              clientY: y,
              dataTransfer: dt,
              view: window,
            });
            try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch {}
            try {
              dt.effectAllowed = 'all';
              if (type === 'dragover' || type === 'drop') dt.dropEffect = 'copy';
            } catch {}
            return ev;
          };

          document.dispatchEvent(mk('dragenter'));
          await wait(25);
          target.dispatchEvent(mk('dragenter'));
          await wait(25);
          for (let i = 0; i < 4; i++) {
            document.dispatchEvent(mk('dragover'));
            await wait(18);
            target.dispatchEvent(mk('dragover'));
            await wait(18);
          }
          target.dispatchEvent(mk('drop'));
          await wait(100);
          document.dispatchEvent(mk('dragend'));

          document.removeEventListener('dragover', preventDragover, { capture: true });
          target.removeEventListener('dragover', preventDragover, { capture: true });

          console.log('[LLM-God] ✓ Gemini DnD fallback completed (single sequence)');
          return true;
        }
        // ---------------------------
        // END GEMINI-ONLY
        // ---------------------------

        // ----- PERPLEXITY (unchanged) -----
        if (hostname.includes('perplexity.ai')) {
          console.log('[LLM-God] Using Perplexity-specific file upload');
          const waitForFileInput = (timeout = 10000) => {
            return new Promise((resolve, reject) => {
              const existing = document.querySelector('input[type="file"]');
              if (existing) { resolve(existing); return; }
              const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector('input[type="file"]');
                if (element) { obs.disconnect(); resolve(element); }
              });
              observer.observe(document.body, { childList: true, subtree: true, attributes: true });
              setTimeout(() => { observer.disconnect(); reject(new Error('File input not found for Perplexity')); }, timeout);
            });
          };
          try {
            const fileInput = await waitForFileInput();
            console.log('[LLM-God] Perplexity file input ready!');
            const dtLocal = new DataTransfer();
            generatedFiles.forEach(f => dtLocal.items.add(f));
            try {
              Object.defineProperty(fileInput, 'files', { value: dtLocal.files, configurable: true });
            } catch (e) {
              const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
              if (descriptor?.set) { descriptor.set.call(fileInput, dtLocal.files); }
            }
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            await wait(200);
            console.log('[LLM-God] ✓ Perplexity file upload complete');
            return true;
          } catch (error) {
            console.error('[LLM-God] ❌ Perplexity file upload failed:', error);
            return false;
          }
        }

        // ----- CLAUDE (unchanged) -----
        if (hostname.includes('claude.ai')) {
          console.log('[LLM-God] Using Claude-specific file upload');
          const waitForFileInput = (timeout = 10000) => {
            return new Promise((resolve, reject) => {
              const findBestInput = () => {
                const inputs = document.querySelectorAll('input[type="file"]');
                if (inputs.length === 0) return null;
                for (let i = inputs.length - 1; i >= 0; i--) {
                  const input = inputs[i];
                  if (!input.disabled) return input;
                }
                return inputs[inputs.length - 1];
              };
              const existing = findBestInput();
              if (existing) { resolve(existing); return; }
              const observer = new MutationObserver((mutations, obs) => {
                const element = findBestInput();
                if (element) { obs.disconnect(); resolve(element); }
              });
              observer.observe(document.body, { childList: true, subtree: true, attributes: true });
              setTimeout(() => {
                observer.disconnect();
                const lastChance = findBestInput();
                if (lastChance) resolve(lastChance); else reject(new Error('File input not found for Claude'));
              }, timeout);
            });
          };
          try {
            const targetInput = await waitForFileInput();
            console.log('[LLM-God] Claude file input found, assigning files...');
            const dtLocal = new DataTransfer();
            generatedFiles.forEach(f => dtLocal.items.add(f));
            try {
              Object.defineProperty(targetInput, 'files', { value: dtLocal.files, configurable: true });
            } catch (e) {
              const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
              if (descriptor?.set) descriptor.set.call(targetInput, dtLocal.files);
            }
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            await wait(100);
            console.log('[LLM-God] ✓ Claude file upload complete via input');
            return true;
          } catch (error) {
            console.log('[LLM-God] Claude file input failed:', error.message, 'Trying drop zone fallback...');
            const simulateDragAndDrop = async (target) => {
              if (!target) return false;
              const dtLocal = new DataTransfer();
              generatedFiles.forEach(f => dtLocal.items.add(f));
              const createDragEvent = (type) => new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer: dtLocal, view: window });
              document.dispatchEvent(createDragEvent('dragenter'));
              target.dispatchEvent(createDragEvent('dragenter'));
              target.dispatchEvent(createDragEvent('dragover'));
              target.dispatchEvent(createDragEvent('drop'));
              target.dispatchEvent(createDragEvent('dragend'));
              document.dispatchEvent(createDragEvent('dragend'));
              target.dispatchEvent(new Event('dragleave', { bubbles: true }));
              document.dispatchEvent(new Event('dragleave', { bubbles: true }));
              return true;
            };
            const dropZone = document.querySelector('[data-testid="chat-input-dropzone"]')
                           || document.querySelector('.MessageComposerDropzone')
                           || document.querySelector('fieldset')
                           || document.querySelector('[role="textbox"]');
            const ok = await simulateDragAndDrop(dropZone);
            return ok;
          }
        }

        // ----- GENERIC (unchanged) -----
        const buildDataTransfer = () => {
          const dtLocal = new DataTransfer();
          generatedFiles.forEach(file => dtLocal.items.add(file));
          return dtLocal;
        };

        const simulateDragAndDrop = async (target) => {
          if (!target) {
            console.error('[LLM-God] No drop target found for simulation');
            return false;
          }
          const rect = target.getBoundingClientRect();
          const coords = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          const isGemini = hostname.includes('gemini.google.com');
          const handlers = new Map();

          if (!isGemini) {
            const createPreventHandler = () => (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) { try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {} }
            };
            ['dragenter', 'dragover'].forEach(type => {
              const h = createPreventHandler();
              handlers.set(type, h);
              target.addEventListener(type, h, { capture: true });
              document.addEventListener(type, h, { capture: true });
            });
          }

          const createDragEvent = (type) => {
            const dtLocal = buildDataTransfer();
            try { Object.defineProperty(dtLocal, 'types', { value: ['Files'] }); } catch {}
            try { dtLocal.effectAllowed = 'all'; } catch {}
            if (type === 'dragover' || type === 'drop') { try { dtLocal.dropEffect = 'copy'; } catch {} }
            const ev = new DragEvent(type, {
              bubbles: true, cancelable: true, composed: true, dataTransfer: dtLocal,
              clientX: coords.x, clientY: coords.y, view: window
            });
            try { Object.defineProperty(ev, 'dataTransfer', { value: dtLocal }); } catch {}
            return ev;
          };

          document.dispatchEvent(createDragEvent('dragenter'));
          await wait(30);
          target.dispatchEvent(createDragEvent('dragenter'));
          await wait(30);
          for (let i = 0; i < 5; i++) {
            document.dispatchEvent(createDragEvent('dragover'));
            await wait(20);
            target.dispatchEvent(createDragEvent('dragover'));
            await wait(20);
          }
          target.dispatchEvent(createDragEvent('drop'));
          await wait(100);
          target.dispatchEvent(createDragEvent('dragend'));
          document.dispatchEvent(createDragEvent('dragend'));
          await wait(100);
          target.dispatchEvent(new Event('dragleave', { bubbles: true }));
          document.dispatchEvent(new Event('dragleave', { bubbles: true }));

          if (!isGemini) {
            handlers.forEach((h, type) => {
              target.removeEventListener(type, h, { capture: true });
              document.removeEventListener(type, h, { capture: true });
            });
          }
          return true;
        };

        const findTarget = () => {
          if (hostname.includes('chatgpt.com')) {
            return document.querySelector('[data-testid="attachment-dropzone"]')
                || document.querySelector('[data-testid="composer-background"]')
                || document.querySelector('form');
          }
          if (hostname.includes('gemini.google.com')) {
            // Gemini handled earlier; left for parity
            return document.querySelector('form')
                || document.querySelector('[contenteditable="true"]')
                || document.querySelector('.ql-editor.textarea')
                || document.body;
          }
          if (hostname.includes('perplexity.ai')) {
            return document.querySelector('form') || document.querySelector('[role="textbox"]') || document.body;
          }
          return document.querySelector('form') || document.body;
        };

        const target = findTarget();
        const success = await simulateDragAndDrop(target);
        if (success) console.log('[LLM-God] ✓ Generic file drop simulation complete');
        else console.error('[LLM-God] ❌ Generic file drop simulation failed');
        return success;

      } catch (error) {
        console.error('[LLM-God] Fatal error:', error);
        return false;
      }
    })(%files%);
  `;

  const scriptWithFiles = script.replace("%files%", JSON.stringify(files));
  await view.webContents.executeJavaScript(scriptWithFiles, true).catch((error) => {
    console.error("Failed to execute drag-and-drop simulation", error);
  });
}




export function sendPromptInView(view: CustomBrowserView) {
  if (view.id && view.id.match("chatgpt")) {
    view.webContents.executeJavaScript(`
            var btn = document.querySelector('button[aria-label*="Send prompt"]');
            if (btn) {
                btn.focus();
                btn.disabled = false;
                btn.click();
            }
        `);
  } else if (view.id && view.id.match("gemini")) {
    view.webContents.focus();
    view.webContents.executeJavaScript(`{
      // Try multiple selectors for Gemini send button
      var btn = document.querySelector("button[aria-label*='Send message']")
             || document.querySelector("button.send-button")
             || document.querySelector('button[data-test-id="send-button"]');
      if (btn) {
        btn.setAttribute("aria-disabled", "false");
        btn.disabled = false;
        btn.focus();
        btn.click();
        console.log('[Gemini] Send button clicked');
      } else {
        // Fallback: simulate Enter key on the editor
        var editor = document.querySelector('.ql-editor.textarea')
                  || document.querySelector('div[aria-label="Enter a prompt for Gemini"]')
                  || document.querySelector('div[role="textbox"]');
        if (editor) {
          editor.focus();
          var event = new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, cancelable: true
          });
          editor.dispatchEvent(event);
          console.log('[Gemini] Enter key simulated as fallback');
        }
      }
    }`);
  } else if (view.id && view.id.match("perplexity")) {
    view.webContents.executeJavaScript(`
      {
        console.log('[Perplexity] Looking for submit button...');
        
        var button = document.querySelector('button[aria-label="Submit"]');

        if (!button) {
           console.log('[Perplexity] aria-label="Submit" not found, trying data-testid');
           button = document.querySelector('[data-testid="submit-button"]');
        }
        
        // Fallback to class-based search
        if (!button) {
          console.log('[Perplexity] data-testid not found, falling back to class selector');
          var buttons = Array.from(document.querySelectorAll('button.bg-super'));
          if (buttons.length > 0) {
            // Usually the last one or one with an SVG
             var buttonsWithSvg = buttons.filter(btn => btn.querySelector('svg'));
             if (buttonsWithSvg.length > 0) {
                button = buttonsWithSvg[buttonsWithSvg.length - 1];
             }
          }
        }
        
        if (button) {
          console.log('[Perplexity] Submit button found, clicking...');
          button.focus();
          button.click();
          console.log('[Perplexity] Submit button clicked successfully');
        } else {
          console.error('[Perplexity] Submit button not found');
        }
      }
                `);
  } else if (view.id && view.id.match("claude")) {
    view.webContents.executeJavaScript(`{
    var btn = document.querySelector("button[aria-label*='Send message']");
    if (!btn) var btn = document.querySelector('button:has(div svg)');
    if (!btn) var btn = document.querySelector('button:has(svg)');
    if (btn) {
      btn.focus();
      btn.disabled = false;
      btn.click();
    }
  }`);
  } else if (view.id && view.id.match("grok")) {
    view.webContents.executeJavaScript(`
    {
      // Try button click first
      var btn = document.querySelector('button[aria-label*="Submit"]')
             || document.querySelector('button[aria-label*="Send"]')
             || document.querySelector('button[type="submit"]');
      
      if (btn) {
        btn.focus();
        btn.disabled = false;
        btn.click();
        console.log('[Grok] Send button clicked');
      } else {
        // Fallback to keyboard simulation
        var textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          var event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            metaKey: true,
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          });
          textarea.dispatchEvent(event);
          console.log('[Grok] Enter key simulated as fallback');
        } else {
          console.log('[Grok] No send method found');
        }
      }
    }
  `);
  } else if (view.id && view.id.match("deepseek")) {
    view.webContents.executeJavaScript(`
     {
       var textarea = document.querySelector('textarea');
       if (textarea) {
         textarea.focus();
         var event = new KeyboardEvent('keydown', {
           key: 'Enter',
           code: 'Enter',
           keyCode: 13,
           bubbles: true,
           cancelable: true
         });
         textarea.dispatchEvent(event);
         console.log('[DeepSeek] Enter key simulated for message submission');
       } else {
         console.log('[DeepSeek] Textarea not found');
       }
     }`);
  } else if (view.id && view.id.match("lmarena")) {
    view.webContents.executeJavaScript(`
        {
        var btn = document.querySelector('button[type="submit"]');
        if (btn) {
            btn.focus();
            btn.disabled = false;
            btn.click();
          } else {
            console.log("Element not found");
          }
    }`);
  } else if (view.id && view.id.match("google.com") && !view.id.match("gemini.google.com")) {
    // Google AI Mode: Click the Send button
    view.webContents.focus();
    view.webContents.executeJavaScript(`
      {
        // Find Send button - check multiple locale labels + class-based fallback
        const allSendBtns = Array.from(document.querySelectorAll(
          'button[aria-label="Send"], button[aria-label="Gửi"], button.OEueve'
        ));
        const sendBtn = allSendBtns.find(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0)
                     || allSendBtns[allSendBtns.length - 1];
        if (sendBtn) {
          sendBtn.focus();
          sendBtn.click();
          console.log('[Google AI] Send button clicked, aria-label:', sendBtn.getAttribute('aria-label'));
        } else {
          // Fallback: try Enter key on textarea
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.focus();
            textarea.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
              bubbles: true, cancelable: true
            }));
            console.log('[Google AI] Enter key dispatched as fallback');
          }
        }
      }
    `);
  } else if (view.id && view.id.match("reddit.com")) {
    view.webContents.focus();
    view.webContents.executeJavaScript(`{
      // Helper to search through shadow roots
      const findDeep = (selector, root = document) => {
        const el = root.querySelector?.(selector);
        if (el) return el;
        const all = root.querySelectorAll?.('*') || [];
        for (const e of all) {
          if (e.shadowRoot) {
            const found = findDeep(selector, e.shadowRoot);
            if (found) return found;
          }
        }
        return null;
      };

      const btn = findDeep("#submit-button") 
               || findDeep('button[aria-label*="Submit"]')
               || findDeep('button[type="submit"]');

      if (btn) {
        btn.focus();
        btn.click();
        console.log('[Reddit] Submit button clicked via deep shadow search');
      } else {
        // Fallback: simulate Enter on the input
        const input = findDeep("#innerTextArea") || document.querySelector("textarea");
        if (input) {
          input.focus();
          // Try form submission first
          const form = input.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            console.log('[Reddit] Form submit dispatched');
          }
          // Also try Enter key
          input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, cancelable: true
          }));
          input.dispatchEvent(new KeyboardEvent('keypress', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, cancelable: true
          }));
          input.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, cancelable: true
          }));
          console.log('[Reddit] Enter key sequence dispatched');
        }
      }
    }`);
  }
}

/**
 * Simulates clicking the copy button to copy the latest answer from a view.
 * Returns true if copy was triggered, null if failed.
 */
export async function copyAnswerFromView(view: CustomBrowserView): Promise<string | null> {
  try {
    if (view.id && view.id.match("chatgpt")) {
      // ChatGPT: Click copy button and read clipboard from page context
      const result = await view.webContents.executeJavaScript(`
        (async () => {
          let copyButtons = document.querySelectorAll('button[data-testid="copy-turn-action-button"]');
          if (copyButtons.length === 0) {
            copyButtons = document.querySelectorAll('button[aria-label="Copy"]');
          }
          if (copyButtons.length === 0) return null;
          
          const lastCopyBtn = copyButtons[copyButtons.length - 1];
          
          // Trigger hover on parent to make button clickable
          const parent = lastCopyBtn.closest('div[class*="group"]') || lastCopyBtn.parentElement;
          if (parent) {
            parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(r => setTimeout(r, 200));
          }
          
          lastCopyBtn.click();
          await new Promise(r => setTimeout(r, 300));
          
          try {
            return await navigator.clipboard.readText();
          } catch (e) {
            return '__CLIPBOARD_READ_FAILED__';
          }
        })()
      `);

      if (result && result !== '__CLIPBOARD_READ_FAILED__') {
        // Write the text back to clipboard via main process
        return result;
      }
      return result === '__CLIPBOARD_READ_FAILED__' ? "__COPIED__" : null;

    } else if (view.id && view.id.match("perplexity")) {
      // Perplexity: Click copy button
      const result = await view.webContents.executeJavaScript(`
        (async () => {
          const copyButtons = document.querySelectorAll('button[aria-label="Copy"]');
          if (copyButtons.length > 0) {
            const lastCopyBtn = copyButtons[copyButtons.length - 1];
            lastCopyBtn.click();
            await new Promise(r => setTimeout(r, 100));
            return true;
          }
          return false;
        })()
      `);
      return result ? "__COPIED__" : null;

    } else if (view.id && view.id.match("gemini")) {
      // Gemini: Click More button first, then Copy button
      const result = await view.webContents.executeJavaScript(`
        (async () => {
          let moreButtons = document.querySelectorAll('button[data-test-id="more-menu-button"]');
          if (moreButtons.length === 0) {
            moreButtons = document.querySelectorAll('button[aria-label="Show more options"]');
          }
          if (moreButtons.length === 0) {
            moreButtons = document.querySelectorAll('button:has(mat-icon[fonticon="more_vert"])');
          }
          if (moreButtons.length === 0) return false;
          
          const lastMoreBtn = moreButtons[moreButtons.length - 1];
          lastMoreBtn.click();
          await new Promise(r => setTimeout(r, 500));
          
          let copyBtn = document.querySelector('button[data-test-id="copy-response-button"]');
          if (!copyBtn) {
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
              const label = btn.querySelector('.item-label');
              if (label && label.textContent && label.textContent.trim().toLowerCase() === 'copy') {
                copyBtn = btn;
                break;
              }
            }
          }
          
          if (copyBtn) {
            copyBtn.click();
            await new Promise(r => setTimeout(r, 300));
            document.body.click();
            
            try {
              return await navigator.clipboard.readText();
            } catch (e) {
              return '__CLIPBOARD_READ_FAILED__';
            }
          }
          
          document.body.click();
          return false;
        })()
      `);

      if (result && result !== '__CLIPBOARD_READ_FAILED__' && result !== false) {
        return result;
      }
      return result === '__CLIPBOARD_READ_FAILED__' ? "__COPIED__" : null;
    }

    return null;
  } catch (error) {
    console.error("Failed to copy answer from view:", view.id, error);
    return null;
  }
}

