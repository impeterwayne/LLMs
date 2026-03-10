/* DeepSeek — Copy full conversation by extracting all markdown blocks */
(async () => {
    const markdownSelector = __MARKDOWN_SELECTORS__;
    const conversation = [];

    /* DeepSeek alternates user/assistant in the chat container.
       User messages typically live in a sibling container without .ds-markdown.
       We walk the entire conversation structure. */

    /* Strategy: find the chat container and iterate through message groups */
    const chatContainer = document.querySelector('.father-container')
        || document.querySelector('[class*="chat-message"]')?.parentElement?.parentElement;

    /* Broader approach: find all message rows */
    const messageRows = document.querySelectorAll('[class*="father"]');

    if (messageRows.length > 0) {
        for (const row of messageRows) {
            const markdownEl = row.querySelector(markdownSelector);
            if (markdownEl) {
                /* This is an assistant response */
                const text = markdownEl.innerText?.trim();
                if (text) conversation.push('## Assistant\n' + text);
            } else {
                /* This may be a user message */
                const userText = row.innerText?.trim();
                if (userText && userText.length > 0) {
                    conversation.push('## User\n' + userText);
                }
            }
        }
    }

    /* Fallback: just grab all markdown divs if structured walk failed */
    if (conversation.length === 0) {
        const markdownDivs = document.querySelectorAll(markdownSelector);
        if (markdownDivs.length === 0) return null;

        for (let i = 0; i < markdownDivs.length; i++) {
            const text = markdownDivs[i].innerText?.trim();
            if (text) {
                conversation.push(`## Response ${i + 1}\n${text}`);
            }
        }
    }

    if (conversation.length === 0) return null;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); }
    catch (e) { /* best effort */ }
    return result;
})()
