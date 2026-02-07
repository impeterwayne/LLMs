/* Grok — Click send button or simulate Enter */
(() => {
    const btn = __clickFirstButton(__SEND_SELECTORS__);
    if (btn) {
        console.log('[Grok] Send button clicked');
    } else {
        const textarea = document.querySelector('__EDITOR_SELECTOR__');
        if (textarea) {
            __simulateEnter(textarea, { metaKey: true, ctrlKey: true });
            console.log('[Grok] Enter key simulated as fallback');
        } else {
            console.log('[Grok] No send method found');
        }
    }
})();
