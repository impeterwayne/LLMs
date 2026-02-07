/* Google AI Mode — Click send button or simulate Enter */
(() => {
    // Find first visible send button from selectors
    const allBtns = Array.from(document.querySelectorAll(__SEND_SELECTORS_JOIN__));
    const sendBtn = allBtns.find(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0)
        || allBtns[allBtns.length - 1];

    if (sendBtn) {
        sendBtn.focus();
        sendBtn.click();
        console.log('[Google AI] Send button clicked, aria-label:', sendBtn.getAttribute('aria-label'));
    } else {
        // Fallback: Enter key on textarea
        const textarea = __findFirst(__EDITOR_SELECTORS__);
        if (textarea) {
            __simulateEnter(textarea);
            console.log('[Google AI] Enter key dispatched as fallback');
        }
    }
})();
