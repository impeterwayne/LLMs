/* Claude — Copy last response via action bar button */
(async () => {
    const copyButtons = document.querySelectorAll(__COPY_SELECTORS__);
    if (copyButtons.length === 0) return null;

    const lastCopyBtn = copyButtons[copyButtons.length - 1];
    lastCopyBtn.click();
    await new Promise(r => setTimeout(r, 300));

    try { return await navigator.clipboard.readText(); }
    catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
})()
