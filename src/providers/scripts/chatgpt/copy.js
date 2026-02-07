/* ChatGPT — Copy last response to clipboard */
(async () => {
    const selectors = __SELECTORS__;
    let copyButtons = [];
    for (const sel of selectors) {
        copyButtons = document.querySelectorAll(sel);
        if (copyButtons.length > 0) break;
    }
    if (copyButtons.length === 0) return null;

    const lastCopyBtn = copyButtons[copyButtons.length - 1];
    const parent = lastCopyBtn.closest('div[class*="group"]') || lastCopyBtn.parentElement;
    if (parent) {
        parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
    }
    lastCopyBtn.click();
    await new Promise(r => setTimeout(r, 300));

    try { return await navigator.clipboard.readText(); }
    catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
})()
