/* Google AI Mode — Inject prompt via execCommand */
((prompt) => {
    const textarea = __findFirst(__SELECTORS__);
    if (textarea) {
        textarea.click();
        textarea.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, prompt);
        console.log('[Google AI] Prompt injected (follow-up safe)');
    } else {
        console.error('[Google AI] Search input not found');
    }
})(__PROMPT__);
