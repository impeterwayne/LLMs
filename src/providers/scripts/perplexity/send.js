/* Perplexity — Click submit button (fallback when native Enter is unavailable) */
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
        console.log('[Perplexity] Found submit button, clicking...');
        button.click();
        console.log('[Perplexity] Submit button clicked');
    } else {
        console.error('[Perplexity] Submit button not found');
    }
})();
