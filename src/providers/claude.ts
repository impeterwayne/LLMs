import { Provider } from './types.js';
import {
    JS_WAIT_FOR_ELEMENT, JS_CLICK_FIRST_BUTTON, JS_FIND_FIRST,
    JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN, JS_SIMULATE_DND,
    compose,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Claude changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    // ProseMirror editor
    editor: 'div.ProseMirror',
    sendButton: [
        'button[aria-label*="Send message"]',
        'button:has(div svg)',
        'button:has(svg)',
    ],
    dropZone: [
        '[data-testid="chat-input-dropzone"]',
        '.MessageComposerDropzone',
        'fieldset',
        '[role="textbox"]',
    ],
};

export const claude: Provider = {
    id: 'claude',
    matchUrl: (url) => /claude\.ai/i.test(url),

    buildInjectScript(prompt: string): string {
        // Strategy: ProseMirror — set innerHTML + dispatch events
        return `
      ${JS_WAIT_FOR_ELEMENT}
      (async (prompt) => {
        try {
          console.log('[Claude] Waiting for editor...');
          const inputElement = await __waitForElement('${SELECTORS.editor}');
          console.log('[Claude] Editor ready!');
          inputElement.innerHTML = prompt;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[Claude] Prompt injected via ProseMirror');
        } catch (error) {
          console.error('[Claude] Failed to inject prompt:', error);
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${JS_CLICK_FIRST_BUTTON}
      (() => {
        const btn = __clickFirstButton(${JSON.stringify(SELECTORS.sendButton)});
        if (btn) console.log('[Claude] Send button clicked');
        else console.error('[Claude] Send button not found');
      })();
    `;
    },

    buildFileDropScript(files): string {
        return `
      ${compose(JS_WAIT, JS_FILE_HELPERS, JS_FIND_FIRST, JS_FILE_INPUT_ASSIGN, JS_SIMULATE_DND, JS_WAIT_FOR_ELEMENT)}
      (async (rawFiles) => {
        try {
          console.log('[Claude] Starting file upload...');
          const generatedFiles = __createFiles(rawFiles);

          // Strategy 1: File input (prefer last non-disabled input)
          try {
            const findBestInput = () => {
              const inputs = document.querySelectorAll('input[type="file"]');
              if (inputs.length === 0) return null;
              for (let i = inputs.length - 1; i >= 0; i--) {
                if (!inputs[i].disabled) return inputs[i];
              }
              return inputs[inputs.length - 1];
            };

            let targetInput = findBestInput();
            if (!targetInput) {
              targetInput = await __waitForElement('input[type="file"]', { timeout: 10000 });
            }

            if (targetInput) {
              const ok = await __assignToFileInput(targetInput, generatedFiles);
              if (ok) {
                await __wait(100);
                console.log('[Claude] ✓ File upload via input');
                return true;
              }
            }
          } catch (inputError) {
            console.log('[Claude] File input failed:', inputError.message, '— trying DnD fallback...');
          }

          // Strategy 2: Drag-and-drop fallback
          const dropZone = __findFirst(${JSON.stringify(SELECTORS.dropZone)});
          const ok = await __simulateDnD(dropZone, generatedFiles);
          if (ok) console.log('[Claude] ✓ File upload via DnD');
          return ok;
        } catch (e) { console.error('[Claude] Fatal:', e); return false; }
      })(${JSON.stringify(files)});
    `;
    },
};
