/* Perplexity — Click submit button with class fallback */
(() => {
    console.log('[Perplexity] Looking for submit button...');
    let button = __clickFirstButton(__SELECTORS__);

    if (!button) {
        // Class-based fallback with SVG check
        console.log('[Perplexity] Trying class-based fallback...');
        const buttons = Array.from(document.querySelectorAll('__CLASS_FALLBACK__'));
        const withSvg = buttons.filter(btn => btn.querySelector('svg'));
        button = withSvg.length > 0 ? withSvg[withSvg.length - 1] : null;
        if (button) {
            button.focus();
            button.click();
        }
    }

    if (button) console.log('[Perplexity] Submit button clicked');
    else console.error('[Perplexity] Submit button not found');
})();
