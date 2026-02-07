/* Claude — Click send button */
(() => {
    const btn = __clickFirstButton(__SELECTORS__);
    if (btn) console.log('[Claude] Send button clicked');
    else console.error('[Claude] Send button not found');
})();
