/* Gemini — Click send button or simulate Enter */
(() => {
    const selectors = __SEND_SELECTORS__;
    let btn = null;
    for (const sel of selectors) {
        btn = document.querySelector(sel);
        if (btn) break;
    }
    if (btn) {
        // Order matters: aria-disabled must be cleared BEFORE click
        btn.setAttribute('aria-disabled', 'false');
        btn.disabled = false;
        btn.focus();
        btn.click();
        console.log('[Gemini] Send button clicked');
    } else {
        // Fallback: simulate Enter key on the editor
        const editor = __findFirst(__EDITOR_SELECTORS__);
        if (editor) {
            __simulateEnter(editor);
            console.log('[Gemini] Enter key simulated as fallback');
        } else {
            console.error('[Gemini] No send method found');
        }
    }
})();
