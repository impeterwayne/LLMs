import { Provider } from './types.js';
import {
  JS_WAIT_FOR_ELEMENT, JS_FIND_FIRST, JS_CLICK_FIRST_BUTTON,
  JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN,
  loadScript,
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
  editorSelectors: [`#${SELECTORS.editor}`, SELECTORS.editorTextbox],
  sendButtonSelectors: SELECTORS.sendButton,
  useNativeEnterToSend: true,
  focusBeforeSend: true,

  buildInjectScript(prompt: string): string {
    return loadScript('perplexity', 'inject', {
      '__EDITOR_ID__': SELECTORS.editor,
      '__EDITOR_TEXTBOX__': SELECTORS.editorTextbox,
      '__PROMPT__': JSON.stringify(prompt),
    }, JS_WAIT_FOR_ELEMENT, JS_WAIT);
  },

  buildSendScript(): string {
    return loadScript('perplexity', 'send', {
      '__SELECTORS__': JSON.stringify(SELECTORS.sendButton),
      '__CLASS_FALLBACK__': SELECTORS.sendButtonClassFallback,
    });
  },

  buildFileDropScript(files): string {
    return loadScript('perplexity', 'fileDrop', {
      '__FILES__': JSON.stringify(files),
    }, JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN, JS_WAIT_FOR_ELEMENT);
  },

  buildCopyScript(): string {
    return loadScript('perplexity', 'copy', {
      '__COPY_SELECTOR__': JSON.stringify(SELECTORS.copyButton[0]),
    });
  },
};
