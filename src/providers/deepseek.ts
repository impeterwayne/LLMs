import { Provider } from './types.js';
import { JS_SET_TEXTAREA_VALUE, JS_SIMULATE_ENTER, compose } from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when DeepSeek changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: 'textarea',
};

export const deepseek: Provider = {
    id: 'deepseek',
    matchUrl: (url) => /deepseek\.com/i.test(url),

    buildInjectScript(prompt: string): string {
        // Strategy: React-controlled textarea — bypass via native setter
        return `
      ${JS_SET_TEXTAREA_VALUE}
      ((prompt) => {
        const el = document.querySelector('${SELECTORS.editor}');
        if (el) {
          __setTextareaValue(el, prompt);
          console.log('[DeepSeek] Prompt injected');
        } else {
          console.error('[DeepSeek] Editor not found');
        }
      })(${JSON.stringify(prompt)});
    `;
    },

    buildSendScript(): string {
        // Strategy: Enter key (DeepSeek uses Enter to submit)
        return `
      ${JS_SIMULATE_ENTER}
      (() => {
        const textarea = document.querySelector('${SELECTORS.editor}');
        if (textarea) {
          __simulateEnter(textarea);
          console.log('[DeepSeek] Enter key simulated for submission');
        } else {
          console.log('[DeepSeek] Textarea not found');
        }
      })();
    `;
    },
};
