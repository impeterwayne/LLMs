import { Provider } from './types.js';
import { JS_FIND_FIRST, JS_EXEC_COMMAND_INSERT, JS_SIMULATE_ENTER, compose } from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Google AI Mode changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: [
        'textarea[aria-label="Ask anything"]',
        'textarea[name="q"]',
        'textarea[aria-label*="Search"]',
        'input[name="q"]',
        'textarea',
    ],
    // Multiple locale labels + class fallback for send button
    sendButton: [
        'button[aria-label="Send"]',
        'button[aria-label="Gửi"]',     // Vietnamese
        'button.OEueve',                 // class-based (fragile)
    ],
};

export const googleai: Provider = {
    id: 'googleai',
    // Match google.com but NOT gemini.google.com
    matchUrl: (url) => /google\.com/i.test(url) && !/gemini\.google\.com/i.test(url),
    focusBeforeInject: true,
    focusBeforeSend: true,

    buildInjectScript(prompt: string): string {
        // Strategy: execCommand for proper framework state sync
        return `
      ${JS_FIND_FIRST}
      ((prompt) => {
        const textarea = __findFirst(${JSON.stringify(SELECTORS.editor)});
        if (textarea) {
          textarea.click();
          textarea.focus();
          document.execCommand('selectAll', false);
          document.execCommand('insertText', false, prompt);
          console.log('[Google AI] Prompt injected (follow-up safe)');
        } else {
          console.error('[Google AI] Search input not found');
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${compose(JS_FIND_FIRST, JS_SIMULATE_ENTER)}
      (() => {
        // Find first visible send button from selectors
        const allBtns = Array.from(document.querySelectorAll(
          ${JSON.stringify(SELECTORS.sendButton.join(', '))}
        ));
        const sendBtn = allBtns.find(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0)
                      || allBtns[allBtns.length - 1];

        if (sendBtn) {
          sendBtn.focus();
          sendBtn.click();
          console.log('[Google AI] Send button clicked, aria-label:', sendBtn.getAttribute('aria-label'));
        } else {
          // Fallback: Enter key on textarea
          const textarea = __findFirst(${JSON.stringify(SELECTORS.editor)});
          if (textarea) {
            __simulateEnter(textarea);
            console.log('[Google AI] Enter key dispatched as fallback');
          }
        }
      })();
    `;
    },
};
