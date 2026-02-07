/* ChatGPT — Inject prompt into editor */
((prompt) => {
    const el = __findFirst(__SELECTORS__);
    if (el) {
        el.innerText = prompt;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[ChatGPT] Prompt injected');
    } else {
        console.error('[ChatGPT] Editor element not found');
    }
})(__PROMPT__);
