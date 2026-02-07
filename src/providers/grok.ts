import { Provider } from './types.js';
import {
  JS_EXEC_COMMAND_INSERT, JS_CLICK_FIRST_BUTTON, JS_SIMULATE_ENTER,
  JS_WAIT, loadScript,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Grok changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
  editor: 'div.tiptap[contenteditable="true"]',
  sendButton: [
    'button[aria-label*="Submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Gửi"]',
    'button[type="submit"]',
  ],
};

export const grok: Provider = {
  id: 'grok',
  matchUrl: (url) => /grok\.com/i.test(url),

  buildInjectScript(prompt: string): string {
    return loadScript('grok', 'inject', {
      '__EDITOR_SELECTOR__': SELECTORS.editor,
      '__PROMPT__': JSON.stringify(prompt),
    }, JS_EXEC_COMMAND_INSERT);
  },

  buildSendScript(): string {
    return loadScript('grok', 'send', {
      '__SEND_SELECTORS__': JSON.stringify(SELECTORS.sendButton),
      '__EDITOR_SELECTOR__': SELECTORS.editor,
    }, JS_WAIT, JS_CLICK_FIRST_BUTTON, JS_SIMULATE_ENTER);
  },
};
