import { Provider } from './types.js';
import {
    JS_WAIT_FOR_ELEMENT, JS_CLICK_FIRST_BUTTON, JS_FIND_FIRST,
    JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN, JS_SIMULATE_DND,
    loadScript,
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
    copyButton: [
        'button[data-testid="action-bar-copy"]',
        'button[aria-label="Copy"]',
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
    editorSelectors: [SELECTORS.editor],
    sendButtonSelectors: SELECTORS.sendButton,

    buildInjectScript(prompt: string): string {
        return loadScript('claude', 'inject', {
            '__EDITOR_SELECTOR__': SELECTORS.editor,
            '__PROMPT__': JSON.stringify(prompt),
        }, JS_WAIT_FOR_ELEMENT);
    },

    buildSendScript(): string {
        return loadScript('claude', 'send', {
            '__SELECTORS__': JSON.stringify(SELECTORS.sendButton),
        }, JS_CLICK_FIRST_BUTTON);
    },

    buildFileDropScript(files): string {
        return loadScript('claude', 'fileDrop', {
            '__DROP_ZONE_SELECTORS__': JSON.stringify(SELECTORS.dropZone),
            '__FILES__': JSON.stringify(files),
        }, JS_WAIT, JS_FILE_HELPERS, JS_FIND_FIRST, JS_FILE_INPUT_ASSIGN, JS_SIMULATE_DND, JS_WAIT_FOR_ELEMENT);
    },

    buildCopyScript(): string {
        return loadScript('claude', 'copy', {
            '__COPY_SELECTORS__': JSON.stringify(SELECTORS.copyButton.join(', ')),
        });
    },
};
