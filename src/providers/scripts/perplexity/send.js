/* Perplexity — Click submit button with full mouse event simulation */
(() => {
    console.log('[Perplexity] Looking for submit button...');
    const selectors = __SELECTORS__;
    let button = null;

    for (const sel of selectors) {
        button = document.querySelector(sel);
        if (button) break;
    }

    if (!button) {
        // Class-based fallback with SVG check
        console.log('[Perplexity] Trying class-based fallback...');
        const buttons = Array.from(document.querySelectorAll('__CLASS_FALLBACK__'));
        const withSvg = buttons.filter(btn => btn.querySelector('svg'));
        button = withSvg.length > 0 ? withSvg[withSvg.length - 1] : null;
    }

    if (button) {
        console.log('[Perplexity] Found submit button, dispatching events...');
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const evtOpts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

        button.focus();
        button.disabled = false;
        button.dispatchEvent(new PointerEvent('pointerdown', { ...evtOpts, pointerId: 1 }));
        button.dispatchEvent(new MouseEvent('mousedown', evtOpts));
        button.dispatchEvent(new PointerEvent('pointerup', { ...evtOpts, pointerId: 1 }));
        button.dispatchEvent(new MouseEvent('mouseup', evtOpts));
        button.dispatchEvent(new MouseEvent('click', evtOpts));
        console.log('[Perplexity] Submit button clicked');
    } else {
        console.error('[Perplexity] Submit button not found');
    }
})();
