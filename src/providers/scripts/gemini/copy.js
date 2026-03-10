/* Gemini — Copy full conversation via More menu → Copy for each turn */
(async () => {
    const moreSelectors = __MORE_MENU_SELECTORS__;
    const copySelectors = __COPY_SELECTORS__;
    const conversation = [];

    /* ── 1. Find all response containers ──────────────────────── */
    /* Gemini uses model-response and user-query containers */
    const allTurns = document.querySelectorAll('model-response, user-query, .conversation-container > div');

    if (allTurns.length > 0) {
        for (const turn of allTurns) {
            const tag = turn.tagName?.toLowerCase();

            if (tag === 'user-query' || turn.querySelector('user-query')) {
                const userText = turn.innerText?.trim();
                if (userText) conversation.push('## User\n' + userText);
                continue;
            }

            if (tag === 'model-response' || turn.querySelector('model-response')) {
                /* Try to click the More menu → Copy for this response */
                let copied = null;

                /* Find the more-menu button within this turn */
                let moreBtn = null;
                for (const sel of moreSelectors) {
                    moreBtn = turn.querySelector(sel);
                    if (moreBtn) break;
                }

                if (moreBtn) {
                    moreBtn.click();
                    await new Promise(r => setTimeout(r, 500));

                    /* Find the Copy option in the menu */
                    let copyBtn = __findFirst(copySelectors);
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
                        await navigator.clipboard.writeText('');
                        copyBtn.click();
                        await new Promise(r => setTimeout(r, 300));
                        document.body.click(); /* dismiss menu */
                        try {
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim().length > 0) copied = text.trim();
                        } catch (e) { /* fall through */ }
                    } else {
                        document.body.click(); /* dismiss menu */
                    }
                }

                /* Fallback: extract innerText from the response content */
                if (!copied) {
                    const content = turn.querySelector('.response-content') || turn.querySelector('.model-response-text') || turn;
                    const text = content.innerText?.trim();
                    if (text) copied = text;
                }

                if (copied) conversation.push('## Assistant\n' + copied);
                continue;
            }
        }
    }

    /* ── 2. Fallback: iterate all More menu buttons ───────────── */
    if (conversation.length === 0) {
        let moreButtons = [];
        for (const sel of moreSelectors) {
            moreButtons = document.querySelectorAll(sel);
            if (moreButtons.length > 0) break;
        }

        for (let i = 0; i < moreButtons.length; i++) {
            moreButtons[i].click();
            await new Promise(r => setTimeout(r, 500));

            let copyBtn = __findFirst(copySelectors);
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
                await navigator.clipboard.writeText('');
                copyBtn.click();
                await new Promise(r => setTimeout(r, 300));
                document.body.click();
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim().length > 0) {
                        conversation.push(`## Response ${i + 1}\n${text.trim()}`);
                    }
                } catch (e) { /* skip */ }
            } else {
                document.body.click();
            }

            await new Promise(r => setTimeout(r, 200)); /* pause between turns */
        }
    }

    if (conversation.length === 0) return false;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); } catch (e) { }
    return result;
})()
