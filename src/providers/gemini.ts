import { Provider } from './types.js';
import {
    JS_FIND_FIRST, JS_EXEC_COMMAND_INSERT,
    JS_SIMULATE_ENTER, JS_WAIT, JS_FILE_HELPERS, JS_FILE_INPUT_ASSIGN,
    loadScript,
} from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when Gemini changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    // Quill-based editor
    editor: [
        '.ql-editor.textarea',
        'div[aria-label="Enter a prompt for Gemini"]',
        'div[role="textbox"]',
    ],
    sendButton: [
        'button[aria-label*="Send message"]',
        'button.send-button',
        'button[data-test-id="send-button"]',
    ],
    moreMenuButton: [
        'button[data-test-id="more-menu-button"]',
        'button[aria-label="Show more options"]',
        'button:has(mat-icon[fonticon="more_vert"])',
    ],
    copyResponseButton: [
        'button[data-test-id="copy-response-button"]',
    ],
    // Paste targets for file upload
    pasteTargets: [
        '[contenteditable="true"]',
        '.ql-editor.textarea',
        '[role="textbox"]',
    ],
    dropTargets: [
        'form',
        '[contenteditable="true"]',
        '.ql-editor.textarea',
    ],
};

export const gemini: Provider = {
    id: 'gemini',
    matchUrl: (url) => /gemini\.google\.com/i.test(url),
    focusBeforeInject: true,
    focusBeforeSend: true,
    editorSelectors: SELECTORS.editor,
    sendButtonSelectors: SELECTORS.sendButton,

    buildReadinessScript(): string {
        // Wait until Quill has hydrated — the .ql-editor element exists in the DOM
        // before Quill attaches, so we poll for isContentEditable + the Quill container
        // having a __quill reference (or the ql-container being present).
        const selectors = JSON.stringify(SELECTORS.editor);
        return `
        new Promise((resolve) => {
            var timeout = 8000, elapsed = 0, interval = 200;
            function check() {
                var sels = ${selectors};
                for (var i = 0; i < sels.length; i++) {
                    var el = document.querySelector(sels[i]);
                    if (el && el.isContentEditable) {
                        // Also check parent for ql-container (Quill ready signal)
                        var container = el.closest('.ql-container');
                        if (container) { resolve(true); return; }
                    }
                }
                elapsed += interval;
                if (elapsed >= timeout) { resolve(false); return; }
                setTimeout(check, interval);
            }
            check();
        });
        `;
    },

    buildInjectScript(prompt: string): string {
        return loadScript('gemini', 'inject', {
            '__SELECTORS__': JSON.stringify(SELECTORS.editor),
            '__PROMPT__': JSON.stringify(prompt),
        }, JS_FIND_FIRST);
    },

    buildSendScript(): string {
        return loadScript('gemini', 'send', {
            '__SEND_SELECTORS__': JSON.stringify(SELECTORS.sendButton),
            '__EDITOR_SELECTORS__': JSON.stringify(SELECTORS.editor),
        }, JS_FIND_FIRST, JS_SIMULATE_ENTER);
    },

    buildFileDropScript(files): string {
        return loadScript('gemini', 'fileDrop', {
            '__PASTE_SELECTORS__': JSON.stringify(SELECTORS.pasteTargets),
            '__DROP_SELECTORS__': JSON.stringify(SELECTORS.dropTargets),
            '__FILES__': JSON.stringify(files),
        }, JS_WAIT, JS_FILE_HELPERS, JS_FIND_FIRST, JS_FILE_INPUT_ASSIGN);
    },

    buildCopyScript(): string {
        return loadScript('gemini', 'copy', {
            '__MORE_MENU_SELECTORS__': JSON.stringify(SELECTORS.moreMenuButton),
            '__COPY_SELECTORS__': JSON.stringify(SELECTORS.copyResponseButton),
        }, JS_FIND_FIRST);
    },
};
