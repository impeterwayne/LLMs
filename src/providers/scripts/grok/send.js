/* Grok — Click send button or simulate Enter */
(async () => {
    /* The send button may be hidden until text is present, give it a moment */
    await __wait(300);
    const btn = __clickFirstButton(__SEND_SELECTORS__);
    if (btn) {
        console.log('[Grok] Send button clicked');
    } else {
        const editor = document.querySelector('__EDITOR_SELECTOR__');
        if (editor) {
            __simulateEnter(editor);
            console.log('[Grok] Enter key simulated as fallback');
        } else {
            console.log('[Grok] No send method found');
        }
    }
})();
