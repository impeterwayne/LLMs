import { Provider } from './types.js';
import {
    JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_SIMULATE_ENTER,
    JS_WAIT, compose,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Reddit changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    // Reddit uses Shadow DOM web components
    editor: [
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
        'input[type="text"]',
    ],
    sendButton: [
        '#submit-button',
        'button[aria-label*="Submit"]',
        'button[type="submit"]',
    ],
    enterFallback: [
        '#innerTextArea',
        'textarea',
    ]
};

export const reddit: Provider = {
    id: 'reddit',
    matchUrl: (url) => /reddit\.com/i.test(url),
    focusBeforeInject: true,
    focusBeforeSend: true,

    buildInjectScript(prompt: string): string {
        // Strategy: execCommand with deep shadow DOM search
        return `
      ${compose(JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_WAIT)}
      (async (prompt) => {
        // Wait for element (Reddit loads dynamically)
        let input = null;
        const selectors = ${JSON.stringify(SELECTORS.editor)};
        for (let i = 0; i < 20; i++) {
          input = __findFirstDeep(selectors);
          if (input) break;
          await __wait(250);
        }

        if (input) {
          input.click();
          input.focus();
          input.select?.();
          document.execCommand('selectAll', false);
          document.execCommand('insertText', false, prompt);
          console.log('[Reddit] Prompt injected:', input.tagName, input.id || '', input.placeholder || '');
        } else {
          console.error('[Reddit] Search input not found after waiting');
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        return `
      ${compose(JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_SIMULATE_ENTER)}
      (() => {
        const btnSelectors = ${JSON.stringify(SELECTORS.sendButton)};
        let btn = null;
        for (const sel of btnSelectors) {
          btn = __findDeep(sel);
          if (btn) break;
        }

        if (btn) {
          btn.focus();
          btn.click();
          console.log('[Reddit] Submit button clicked via deep shadow search');
        } else {
          // Fallback: Enter key + form submit
          const input = __findDeep('${SELECTORS.enterFallback[0]}')
                     || document.querySelector('${SELECTORS.enterFallback[1]}');
          if (input) {
            input.focus();
            const form = input.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              console.log('[Reddit] Form submit dispatched');
            }
            __simulateEnter(input);
            console.log('[Reddit] Enter key sequence dispatched');
          }
        }
      })();
    `;
    },
};
