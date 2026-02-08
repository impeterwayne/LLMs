/* DeepSeek — Copy last response by extracting markdown content */
(async () => {
    /* DeepSeek uses hashed class names with no stable aria-labels or data-testids
       on its action buttons, so we extract markdown content directly. */
    const markdownDivs = document.querySelectorAll(__MARKDOWN_SELECTORS__);
    if (markdownDivs.length === 0) return null;

    const lastMarkdown = markdownDivs[markdownDivs.length - 1];
    const text = lastMarkdown.innerText;
    if (text) {
        try {
            await navigator.clipboard.writeText(text);
            return text;
        } catch (e) {
            return text;
        }
    }
    return null;
})()
