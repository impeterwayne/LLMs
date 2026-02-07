/* Gemini — Copy last response via More menu */
(async () => {
    const moreSelectors = __MORE_MENU_SELECTORS__;
    let moreButtons = [];
    for (const sel of moreSelectors) {
        moreButtons = document.querySelectorAll(sel);
        if (moreButtons.length > 0) break;
    }
    if (moreButtons.length === 0) return false;

    const lastMoreBtn = moreButtons[moreButtons.length - 1];
    lastMoreBtn.click();
    await new Promise(r => setTimeout(r, 500));

    let copyBtn = __findFirst(__COPY_SELECTORS__);
    if (!copyBtn) {
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const label = btn.querySelector('.item-label');
            if (label && label.textContent && label.textContent.trim().toLowerCase() === 'copy') {
                copyBtn = btn; break;
            }
        }
    }

    if (copyBtn) {
        copyBtn.click();
        await new Promise(r => setTimeout(r, 300));
        document.body.click();
        try { return await navigator.clipboard.readText(); }
        catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
    }
    document.body.click();
    return false;
})()
