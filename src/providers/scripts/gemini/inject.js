/* Gemini — Inject prompt into Quill editor via execCommand */
((prompt) => {
    const el = __findFirst(__SELECTORS__);
    if (el) {
        __execCommandInsert(el, prompt);
        console.log('[Gemini] Prompt injected via execCommand (follow-up safe)');
    } else {
        console.error('[Gemini] Editor element not found');
    }
})(__PROMPT__);
