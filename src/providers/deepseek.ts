import { Provider } from './types.js';
import { JS_SET_TEXTAREA_VALUE, JS_SIMULATE_ENTER, loadScript } from './shared.js';

// ═══════════════════════════════════════════════════════════════
// SELECTORS — Update these when DeepSeek changes its DOM
// ═══════════════════════════════════════════════════════════════
const SELECTORS = {
    editor: 'textarea',
    // DeepSeek uses hashed class names with no stable aria-labels on buttons.
    // We extract response text directly from the markdown container.
    markdownContent: [
        '.ds-markdown',
        '.ds-message .ds-markdown',
    ],
};

export const deepseek: Provider = {
    id: 'deepseek',
    matchUrl: (url) => /deepseek\.com/i.test(url),

    buildInjectScript(prompt: string): string {
        return loadScript('deepseek', 'inject', {
            '__EDITOR_SELECTOR__': SELECTORS.editor,
            '__PROMPT__': JSON.stringify(prompt),
        }, JS_SET_TEXTAREA_VALUE);
    },

    buildSendScript(): string {
        return loadScript('deepseek', 'send', {
            '__EDITOR_SELECTOR__': SELECTORS.editor,
        }, JS_SIMULATE_ENTER);
    },

    buildCopyScript(): string {
        return loadScript('deepseek', 'copy', {
            '__MARKDOWN_SELECTORS__': JSON.stringify(SELECTORS.markdownContent[0]),
        });
    },
};
