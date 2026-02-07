/* Perplexity — Copy last response */
(async () => {
    const copyButtons = document.querySelectorAll(__COPY_SELECTOR__);
    if (copyButtons.length > 0) {
        copyButtons[copyButtons.length - 1].click();
        await new Promise(r => setTimeout(r, 100));
        return true;
    }
    return false;
})()
