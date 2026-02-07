import { Provider } from './types.js';
import { JS_FIND_FIRST, JS_CLICK_FIRST_BUTTON, JS_WAIT, JS_FILE_HELPERS, JS_SIMULATE_DND, compose } from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when ChatGPT changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: [
        '#prompt-textarea > p',
    ],
    sendButton: [
        'button[aria-label*="Send prompt"]',
    ],
    copyButton: [
        'button[data-testid="copy-turn-action-button"]',
        'button[aria-label="Copy"]',
    ],
    dropTarget: [
        '[data-testid="attachment-dropzone"]',
        '[data-testid="composer-background"]',
        'form',
    ],
};

export const chatgpt: Provider = {
    id: 'chatgpt',
    matchUrl: (url) => /chatgpt\.com/i.test(url),

    buildInjectScript(prompt: string): string {
        return `
      ${JS_FIND_FIRST}
      ((prompt) => {
        const el = __findFirst(${JSON.stringify(SELECTORS.editor)});
        if (el) {
          el.innerText = prompt;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('[ChatGPT] Prompt injected');
        } else {
          console.error('[ChatGPT] Editor element not found');
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${JS_CLICK_FIRST_BUTTON}
      (() => {
        const btn = __clickFirstButton(${JSON.stringify(SELECTORS.sendButton)});
        if (btn) console.log('[ChatGPT] Send button clicked');
        else console.error('[ChatGPT] Send button not found');
      })();
    `;
    },

    buildFileDropScript(files): string {
        return `
      ${compose(JS_WAIT, JS_FILE_HELPERS, JS_FIND_FIRST, JS_SIMULATE_DND)}
      (async (rawFiles) => {
        try {
          const generatedFiles = __createFiles(rawFiles);
          const target = __findFirst(${JSON.stringify(SELECTORS.dropTarget)});
          const ok = await __simulateDnD(target, generatedFiles);
          if (ok) console.log('[ChatGPT] ✓ File drop complete');
          else console.error('[ChatGPT] ❌ File drop failed');
          return ok;
        } catch (e) { console.error('[ChatGPT] Fatal:', e); return false; }
      })(${JSON.stringify(files)});
    `;
    },

    buildCopyScript(): string {
        return `
      (async () => {
        const selectors = ${JSON.stringify(SELECTORS.copyButton)};
        let copyButtons = [];
        for (const sel of selectors) {
          copyButtons = document.querySelectorAll(sel);
          if (copyButtons.length > 0) break;
        }
        if (copyButtons.length === 0) return null;

        const lastCopyBtn = copyButtons[copyButtons.length - 1];
        const parent = lastCopyBtn.closest('div[class*="group"]') || lastCopyBtn.parentElement;
        if (parent) {
          parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          await new Promise(r => setTimeout(r, 200));
        }
        lastCopyBtn.click();
        await new Promise(r => setTimeout(r, 300));

        try { return await navigator.clipboard.readText(); }
        catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
      })()
    `;
    },
};
