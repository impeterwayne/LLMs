/* Grok — Copy last response via action bar button */
(async () => {
    /* Grok uses localized aria-labels. Try known patterns. */
    const selectors = __COPY_SELECTORS__;
    let copyButtons = [];
    for (const sel of selectors) {
        copyButtons = document.querySelectorAll(sel);
        if (copyButtons.length > 0) break;
    }

    /* Fallback: scan all action-buttons divs for buttons with copy-like SVG */
    if (copyButtons.length === 0) {
        const actionDivs = document.querySelectorAll('.action-buttons');
        if (actionDivs.length > 0) {
            const lastActions = actionDivs[actionDivs.length - 1];
            const buttons = lastActions.querySelectorAll('button');
            for (const btn of buttons) {
                const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                if (label.includes('copy')) {
                    copyButtons = [btn];
                    break;
                }
            }
        }
    }

    if (copyButtons.length === 0) {
        /* Last resort: extract markdown text directly */
        const markdownDivs = document.querySelectorAll('.response-content-markdown');
        if (markdownDivs.length > 0) {
            return markdownDivs[markdownDivs.length - 1].innerText;
        }
        return null;
    }

    const lastCopyBtn = copyButtons[copyButtons.length - 1];
    lastCopyBtn.click();
    await new Promise(r => setTimeout(r, 300));

    try { return await navigator.clipboard.readText(); }
    catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
})()
