/* DeepSeek — Submit via Enter key */
(() => {
    const textarea = document.querySelector('__EDITOR_SELECTOR__');
    if (textarea) {
        __simulateEnter(textarea);
        console.log('[DeepSeek] Enter key simulated for submission');
    } else {
        console.log('[DeepSeek] Textarea not found');
    }
})();
