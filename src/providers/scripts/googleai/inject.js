/* Google AI Mode — Inject prompt into textarea (focus-independent) */
((prompt) => {
    const textarea = __findFirst(__SELECTORS__);
    if (!textarea) {
        console.error('[Google AI] Search input not found');
        return;
    }

    /* Strategy 1: execCommand (best, but requires document focus) */
    try {
        textarea.click();
        textarea.focus();
        if (document.hasFocus()) {
            document.execCommand('selectAll', false);
            const ok = document.execCommand('insertText', false, prompt);
            if (ok) {
                console.log('[Google AI] Prompt injected via execCommand');
                return;
            }
        }
    } catch (e) {
        console.warn('[Google AI] execCommand failed, trying fallback:', e);
    }

    /* Strategy 2: Native value setter (works without focus for textarea/input) */
    try {
        const proto = Object.getPrototypeOf(textarea);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
            setter.call(textarea, prompt);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[Google AI] Prompt injected via native setter (no focus needed)');
            return;
        }
    } catch (e) {
        console.warn('[Google AI] Native setter failed:', e);
    }

    /* Strategy 3: Direct value assignment (last resort) */
    textarea.value = prompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[Google AI] Prompt injected via direct value assignment');
})(__PROMPT__);
