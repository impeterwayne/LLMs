import { Provider } from './types.js';
import {
  JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_SIMULATE_ENTER,
  JS_WAIT, loadScript,
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
  editorSelectors: SELECTORS.editor,
  sendButtonSelectors: SELECTORS.sendButton,

  buildInjectScript(prompt: string): string {
    return loadScript('reddit', 'inject', {
      '__SELECTORS__': JSON.stringify(SELECTORS.editor),
      '__PROMPT__': JSON.stringify(prompt),
    }, JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_WAIT);
  },

  buildSendScript(): string {
    return loadScript('reddit', 'send', {
      '__SEND_SELECTORS__': JSON.stringify(SELECTORS.sendButton),
      '__ENTER_FALLBACK_0__': SELECTORS.enterFallback[0],
      '__ENTER_FALLBACK_1__': SELECTORS.enterFallback[1],
    }, JS_FIND_DEEP, JS_FIND_FIRST_DEEP, JS_SIMULATE_ENTER);
  },
};
