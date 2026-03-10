/* Google AI Mode — Submit query via URL navigation (most reliable) */
(() => {
    // Get the prompt from the textarea
    const textarea = __findFirst(__EDITOR_SELECTORS__);
    const text = textarea?.value?.trim();

    if (text) {
        // Google AI mode uses udm=50 parameter for AI responses.
        // Direct URL navigation is the most reliable submission method
        // because it bypasses Google's framework state management.
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(text) + '&udm=50';
        window.location.href = searchUrl;
        console.log('[Google AI] Navigating to search URL:', searchUrl.slice(0, 80));
        return;
    }

    // Fallback: try button click if textarea is empty (user may have typed directly)
    const allBtns = Array.from(document.querySelectorAll(__SEND_SELECTORS_JOIN__));
    const sendBtn = allBtns.find(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0)
        || allBtns[allBtns.length - 1];

    if (sendBtn) {
        sendBtn.focus();
        sendBtn.click();
        console.log('[Google AI] Send button clicked, aria-label:', sendBtn.getAttribute('aria-label'));
    } else if (textarea) {
        __simulateEnter(textarea);
        console.log('[Google AI] Enter key dispatched as fallback');
    }
})();
