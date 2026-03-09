import { Provider } from './types.js';
import { JS_FIND_FIRST, JS_SIMULATE_ENTER, loadScript } from './shared.js';

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
  editorSelectors: SELECTORS.editor,
  sendButtonSelectors: SELECTORS.sendButton,

  buildInjectScript(prompt: string): string {
    return loadScript('googleai', 'inject', {
      '__SELECTORS__': JSON.stringify(SELECTORS.editor),
      '__PROMPT__': JSON.stringify(prompt),
    }, JS_FIND_FIRST);
  },

  buildSendScript(): string {
    return loadScript('googleai', 'send', {
      '__SEND_SELECTORS_JOIN__': JSON.stringify(SELECTORS.sendButton.join(', ')),
      '__EDITOR_SELECTORS__': JSON.stringify(SELECTORS.editor),
    }, JS_FIND_FIRST, JS_SIMULATE_ENTER);
  },
};
