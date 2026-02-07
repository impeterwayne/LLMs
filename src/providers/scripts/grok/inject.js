/* Grok — Inject prompt into contenteditable (TipTap/ProseMirror) */
((prompt) => {
    const el = document.querySelector('__EDITOR_SELECTOR__');
    if (el) {
        __execCommandInsert(el, prompt);
        console.log('[Grok] Prompt injected');
    } else {
        console.error('[Grok] Editor not found');
    }
})(__PROMPT__);
