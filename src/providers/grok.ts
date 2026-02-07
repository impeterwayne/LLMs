import { Provider } from './types.js';
import {
    JS_SET_TEXTAREA_VALUE, JS_CLICK_FIRST_BUTTON, JS_SIMULATE_ENTER,
    compose,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Grok changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: 'textarea',
    sendButton: [
        'button[aria-label*="Submit"]',
        'button[aria-label*="Send"]',
        'button[type="submit"]',
    ],
};

export const grok: Provider = {
    id: 'grok',
    matchUrl: (url) => /grok\.com/i.test(url),

    buildInjectScript(prompt: string): string {
        // Strategy: React-controlled textarea — bypass via native setter
        return `
      ${JS_SET_TEXTAREA_VALUE}
      ((prompt) => {
        const el = document.querySelector('${SELECTORS.editor}');
        if (el) {
          // Hide placeholder span
          const span = el.previousElementSibling;
          if (span) span.classList.add('hidden');
          __setTextareaValue(el, prompt);
          console.log('[Grok] Prompt injected');
        } else {
          console.error('[Grok] Editor not found');
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${compose(JS_CLICK_FIRST_BUTTON, JS_SIMULATE_ENTER)}
      (() => {
        const btn = __clickFirstButton(${JSON.stringify(SELECTORS.sendButton)});
        if (btn) {
          console.log('[Grok] Send button clicked');
        } else {
          const textarea = document.querySelector('${SELECTORS.editor}');
          if (textarea) {
            __simulateEnter(textarea, { metaKey: true, ctrlKey: true });
            console.log('[Grok] Enter key simulated as fallback');
          } else {
            console.log('[Grok] No send method found');
          }
        }
      })();
    `;
    },
};
