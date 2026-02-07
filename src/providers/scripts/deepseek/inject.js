/* DeepSeek — Inject prompt into textarea */
((prompt) => {
    const el = document.querySelector('__EDITOR_SELECTOR__');
    if (el) {
        __setTextareaValue(el, prompt);
        console.log('[DeepSeek] Prompt injected');
    } else {
        console.error('[DeepSeek] Editor not found');
    }
})(__PROMPT__);
