/* Grok — Click send button or simulate Enter (both modes) */
(async () => {
    /* Give the UI a moment to reveal the send button after text injection */
    await __wait(400);

    /* Try explicit send button selectors first */
    var btn = __clickFirstButton(__SEND_SELECTORS__);
    if (btn) {
        console.log('[Grok] Send button clicked');
        return;
    }

    /* The submit button may be inside a hidden wrapper that only becomes visible
       when the textarea has content. Force-enable it. */
    var submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        var hiddenParent = submitBtn.closest('[class*="hidden"]');
        if (hiddenParent) {
            hiddenParent.style.display = 'flex';
            hiddenParent.classList.remove('hidden');
        }
        await __wait(100);
        submitBtn.click();
        console.log('[Grok] Submit button force-clicked');
        return;
    }

    /* Fallback: submit via the form directly */
    var form = document.querySelector('form');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        console.log('[Grok] Form submitted directly');
        return;
    }

    /* Last fallback: simulate Enter on whatever editor is found */
    var editor = document.querySelector('__EDITOR_SELECTOR__')
        || document.querySelector('__TEXTAREA_SELECTOR__');
    if (editor) {
        __simulateEnter(editor);
        console.log('[Grok] Enter key simulated as fallback');
    } else {
        console.log('[Grok] No send method found');
    }
})();
