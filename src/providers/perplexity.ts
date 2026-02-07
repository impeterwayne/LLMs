import { Provider } from './types.js';
import {
    JS_WAIT_FOR_ELEMENT, JS_FIND_FIRST, JS_CLICK_FIRST_BUTTON,
    JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN,
    compose,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Perplexity changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    // Lexical editor — identified by ID 'ask-input' with __lexicalEditor property
    editor: 'ask-input',
    editorTextbox: '[role="textbox"]',
    sendButton: [
        'button[aria-label="Submit"]',
        '[data-testid="submit-button"]',
    ],
    // Class-based fallback for submit button (fragile)
    sendButtonClassFallback: 'button.bg-super',
    copyButton: [
        'button[aria-label="Copy"]',
    ],
};

export const perplexity: Provider = {
    id: 'perplexity',
    matchUrl: (url) => /perplexity\.ai/i.test(url),

    buildInjectScript(prompt: string): string {
        // Strategy: Lexical editor — use parseEditorState for proper state sync
        return `
      ${compose(JS_WAIT_FOR_ELEMENT, JS_WAIT)}
      (async (prompt) => {
        try {
          console.log('[Perplexity] Waiting for editor...');
          const editorElement = await __waitForElement(
            '${SELECTORS.editor}',
            { checkFn: (el) => el.__lexicalEditor || el.tagName === 'TEXTAREA' }
          );
          console.log('[Perplexity] Editor ready!');

          if (editorElement && editorElement.__lexicalEditor) {
            const editor = editorElement.__lexicalEditor;
            console.log('[Perplexity] Using Lexical editor');
            editor.focus();
            const newState = {
              root: {
                children: [{
                  children: [{
                    detail: 0, format: 0, mode: 'normal', style: '',
                    text: prompt, type: 'text', version: 1,
                  }],
                  direction: 'ltr', format: '', indent: 0,
                  type: 'paragraph', version: 1,
                }],
                direction: 'ltr', format: '', indent: 0,
                type: 'root', version: 1,
              },
            };
            const editorState = editor.parseEditorState(JSON.stringify(newState));
            editor.setEditorState(editorState);

            // Dispatch paste event to trigger framework reactivity
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', '');
            const targetElement = editorElement.querySelector('${SELECTORS.editorTextbox}') || editorElement;
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer, bubbles: true, cancelable: true, composed: true,
            });
            targetElement.dispatchEvent(pasteEvent);
            console.log('[Perplexity] Prompt injected via Lexical');
          } else if (editorElement) {
            // Textarea fallback
            console.log('[Perplexity] Using textarea fallback');
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            )?.set;
            setter?.call(editorElement, prompt);
            editorElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch (error) {
          console.error('[Perplexity] Failed to inject prompt:', error);
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${JS_CLICK_FIRST_BUTTON}
      (() => {
        console.log('[Perplexity] Looking for submit button...');
        let button = __clickFirstButton(${JSON.stringify(SELECTORS.sendButton)});

        if (!button) {
          // Class-based fallback with SVG check
          console.log('[Perplexity] Trying class-based fallback...');
          const buttons = Array.from(document.querySelectorAll('${SELECTORS.sendButtonClassFallback}'));
          const withSvg = buttons.filter(btn => btn.querySelector('svg'));
          button = withSvg.length > 0 ? withSvg[withSvg.length - 1] : null;
          if (button) {
            button.focus();
            button.click();
          }
        }

        if (button) console.log('[Perplexity] Submit button clicked');
        else console.error('[Perplexity] Submit button not found');
      })();
    `;
    },

    buildFileDropScript(files): string {
        return `
      ${compose(JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN, JS_WAIT_FOR_ELEMENT)}
      (async (rawFiles) => {
        try {
          console.log('[Perplexity] Starting file upload...');
          const generatedFiles = __createFiles(rawFiles);
          const fileInput = await __waitForElement('input[type="file"]');
          console.log('[Perplexity] File input ready!');
          const ok = await __assignToFileInput(fileInput, generatedFiles);
          if (ok) { await __wait(200); console.log('[Perplexity] ✓ File upload complete'); }
          else console.error('[Perplexity] ❌ File upload failed');
          return ok;
        } catch (error) {
          console.error('[Perplexity] ❌ File upload error:', error);
          return false;
        }
      })(${JSON.stringify(files)});
    `;
    },

    buildCopyScript(): string {
        return `
      (async () => {
        const copyButtons = document.querySelectorAll(${JSON.stringify(SELECTORS.copyButton[0])});
        if (copyButtons.length > 0) {
          copyButtons[copyButtons.length - 1].click();
          await new Promise(r => setTimeout(r, 100));
          return true;
        }
        return false;
      })()
    `;
    },
};
