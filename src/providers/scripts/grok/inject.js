/* Grok — Inject prompt (supports both textarea and contenteditable modes) */
((prompt) => {
    /* Mode 1: TipTap contenteditable (logged-in view) */
    const ce = document.querySelector('__EDITOR_SELECTOR__');
    if (ce) {
        __execCommandInsert(ce, prompt);
        console.log('[Grok] Prompt injected into contenteditable');
        return;
    }

    /* Mode 2: Plain textarea (logged-out / landing page) */
    const ta = document.querySelector('__TEXTAREA_SELECTOR__');
    if (ta) {
        __setTextareaValue(ta, prompt);
        console.log('[Grok] Prompt injected into textarea');
        return;
    }

    console.error('[Grok] No editor found (tried contenteditable + textarea)');
})(__PROMPT__);
