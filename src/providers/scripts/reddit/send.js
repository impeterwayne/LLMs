/* Reddit — Click submit button with DnD fallback via Enter + form submit */
(() => {
    const btnSelectors = __SEND_SELECTORS__;
    let btn = null;
    for (const sel of btnSelectors) {
        btn = __findDeep(sel);
        if (btn) break;
    }

    if (btn) {
        btn.focus();
        btn.click();
        console.log('[Reddit] Submit button clicked via deep shadow search');
    } else {
        // Fallback: Enter key + form submit
        const input = __findDeep('__ENTER_FALLBACK_0__')
            || document.querySelector('__ENTER_FALLBACK_1__');
        if (input) {
            input.focus();
            const form = input.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                console.log('[Reddit] Form submit dispatched');
            }
            __simulateEnter(input);
            console.log('[Reddit] Enter key sequence dispatched');
        }
    }
})();
