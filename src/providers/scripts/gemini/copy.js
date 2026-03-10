/* Gemini — Copy full conversation using direct copy buttons on each response */
(async () => {
    const copySelectors = __COPY_SELECTORS__;
    const conversation = [];

    /* ── 1. Find all response containers ──────────────────────── */
    /* Gemini uses <model-response> and <user-query> custom elements
       inside .conversation-container */
    const allTurns = document.querySelectorAll(
        'model-response, user-query, .conversation-container > div'
    );

    if (allTurns.length > 0) {
        for (const turn of allTurns) {
            const tag = turn.tagName?.toLowerCase();

            /* ── User turn ──────────────────────────────────── */
            if (tag === 'user-query' || turn.querySelector('user-query')) {
                const queryEl = tag === 'user-query' ? turn : turn.querySelector('user-query');
                const textEl = queryEl?.querySelector('.query-text') || queryEl;
                const userText = textEl?.innerText?.trim();
                if (userText) conversation.push('## User\n' + userText);
                continue;
            }

            /* ── Model turn ─────────────────────────────────── */
            if (tag === 'model-response' || turn.querySelector('model-response')) {
                let copied = null;

                /* Find the direct copy button in the response footer.
                   Gemini renders: <copy-button> → <button data-test-id="copy-button"> */
                let copyBtn = null;
                for (const sel of copySelectors) {
                    copyBtn = turn.querySelector(sel);
                    if (copyBtn) break;
                }

                /* Broader fallback: look within the closest response-container */
                if (!copyBtn) {
                    const responseContainer = turn.closest('.conversation-container') || turn;
                    const footer = responseContainer.querySelector('.response-container-footer') ||
                        responseContainer.querySelector('message-actions');
                    if (footer) {
                        for (const sel of copySelectors) {
                            copyBtn = footer.querySelector(sel);
                            if (copyBtn) break;
                        }
                    }
                }

                if (copyBtn) {
                    /* Clear clipboard, click copy, wait, then read */
                    await navigator.clipboard.writeText('');
                    copyBtn.click();
                    await new Promise(r => setTimeout(r, 400));
                    try {
                        const text = await navigator.clipboard.readText();
                        if (text && text.trim().length > 0) copied = text.trim();
                    } catch (e) { /* clipboard read failed, fall through */ }
                }

                /* Fallback: extract content from the markdown container */
                if (!copied) {
                    const content =
                        turn.querySelector('.markdown.markdown-main-panel') ||
                        turn.querySelector('.model-response-text') ||
                        turn.querySelector('.response-content') ||
                        turn.querySelector('message-content') ||
                        turn;
                    const text = content.innerText?.trim();
                    if (text) copied = text;
                }

                if (copied) conversation.push('## Assistant\n' + copied);
                continue;
            }
        }
    }

    /* ── 2. Fallback: find all copy-button elements on the page ── */
    if (conversation.length === 0) {
        /* Gemini wraps copy buttons in <copy-button> custom elements */
        let copyButtons = document.querySelectorAll('copy-button button');
        if (copyButtons.length === 0) {
            for (const sel of copySelectors) {
                copyButtons = document.querySelectorAll(sel);
                if (copyButtons.length > 0) break;
            }
        }

        for (let i = 0; i < copyButtons.length; i++) {
            await navigator.clipboard.writeText('');
            copyButtons[i].click();
            await new Promise(r => setTimeout(r, 400));
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().length > 0) {
                    conversation.push(`## Response ${i + 1}\n${text.trim()}`);
                }
            } catch (e) { /* skip */ }
            await new Promise(r => setTimeout(r, 150));
        }
    }

    if (conversation.length === 0) return false;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); } catch (e) { }
    return result;
})()
