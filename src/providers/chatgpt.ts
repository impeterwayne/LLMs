import { Provider } from './types.js';
import { JS_FIND_FIRST, JS_CLICK_FIRST_BUTTON, JS_WAIT, JS_FILE_HELPERS, JS_SIMULATE_DND, loadScript } from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when ChatGPT changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: [
        '#prompt-textarea > p',
    ],
    sendButton: [
        'button[aria-label*="Send prompt"]',
    ],
    copyButton: [
        'button[data-testid="copy-turn-action-button"]',
        'button[aria-label="Copy"]',
    ],
    dropTarget: [
        '[data-testid="attachment-dropzone"]',
        '[data-testid="composer-background"]',
        'form',
    ],
};

export const chatgpt: Provider = {
    id: 'chatgpt',
    matchUrl: (url) => /chatgpt\.com/i.test(url),
    editorSelectors: SELECTORS.editor,
    sendButtonSelectors: SELECTORS.sendButton,

    buildInjectScript(prompt: string): string {
        return loadScript('chatgpt', 'inject', {
            '__SELECTORS__': JSON.stringify(SELECTORS.editor),
            '__PROMPT__': JSON.stringify(prompt),
        }, JS_FIND_FIRST);
    },

    buildSendScript(): string {
        return loadScript('chatgpt', 'send', {
            '__SELECTORS__': JSON.stringify(SELECTORS.sendButton),
        }, JS_CLICK_FIRST_BUTTON);
    },

    buildFileDropScript(files): string {
        return loadScript('chatgpt', 'fileDrop', {
            '__SELECTORS__': JSON.stringify(SELECTORS.dropTarget),
            '__FILES__': JSON.stringify(files),
        }, JS_WAIT, JS_FILE_HELPERS, JS_FIND_FIRST, JS_SIMULATE_DND);
    },

    buildCopyScript(): string {
        return loadScript('chatgpt', 'copy', {
            '__SELECTORS__': JSON.stringify(SELECTORS.copyButton),
        });
    },
};
