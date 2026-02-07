/* Reddit — Inject prompt via execCommand with deep shadow DOM */
(async (prompt) => {
    // Wait for element (Reddit loads dynamically)
    let input = null;
    const selectors = __SELECTORS__;
    for (let i = 0; i < 20; i++) {
        input = __findFirstDeep(selectors);
        if (input) break;
        await __wait(250);
    }

    if (input) {
        input.click();
        input.focus();
        input.select?.();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, prompt);
        console.log('[Reddit] Prompt injected:', input.tagName, input.id || '', input.placeholder || '');
    } else {
        console.error('[Reddit] Search input not found after waiting');
    }
})(__PROMPT__);
