/* Grok — Inject prompt into textarea */
((prompt) => {
    const el = document.querySelector('__EDITOR_SELECTOR__');
    if (el) {
        // Hide placeholder span
        const span = el.previousElementSibling;
        if (span) span.classList.add('hidden');
        __setTextareaValue(el, prompt);
        console.log('[Grok] Prompt injected');
    } else {
        console.error('[Grok] Editor not found');
    }
})(__PROMPT__);
