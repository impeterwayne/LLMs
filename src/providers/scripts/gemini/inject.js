/* Gemini — Inject prompt into Quill editor (focus-independent) */
((prompt) => {
    const el = __findFirst(__SELECTORS__);
    if (!el) {
        console.error('[Gemini] Editor element not found');
        return;
    }

    /* Strategy 1: execCommand (best, but requires document focus) */
    try {
        el.click();
        el.focus();
        const sel = window.getSelection();
        if (sel && document.hasFocus()) {
            sel.selectAllChildren(el);
            document.execCommand('delete', false);
            const ok = document.execCommand('insertText', false, prompt);
            if (ok) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('[Gemini] Prompt injected via execCommand');
                return;
            }
        }
    } catch (e) {
        console.warn('[Gemini] execCommand failed, trying fallback:', e);
    }

    /* Strategy 2: Direct DOM manipulation (works without focus) */
    /* Clear existing content */
    while (el.firstChild) el.removeChild(el.firstChild);
    /* Insert as a <p> to match Quill's expected structure */
    const p = document.createElement('p');
    p.textContent = prompt;
    el.appendChild(p);
    /* Fire events so Quill picks up the change */
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    /* Also try dispatching a 'text-change' for Quill delta sync */
    try {
        el.dispatchEvent(new CustomEvent('text-change', { bubbles: true }));
    } catch (e) { /* ignore */ }
    console.log('[Gemini] Prompt injected via DOM fallback (no focus needed)');
})(__PROMPT__);
