/* ChatGPT — Click send button */
(() => {
    const btn = __clickFirstButton(__SELECTORS__);
    if (btn) console.log('[ChatGPT] Send button clicked');
    else console.error('[ChatGPT] Send button not found');
})();
