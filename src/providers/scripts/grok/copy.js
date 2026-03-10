/* Grok — Copy full conversation via action bar buttons */
(async () => {
    const selectors = __COPY_SELECTORS__;
    const conversation = [];

    /* ── 1. Find all message containers ──────────────────────── */
    /* Grok uses message containers with action-buttons divs for responses.
       User messages don't have action-buttons. */
    const messageContainers = document.querySelectorAll('[class*="message"]');

    /* Strategy: walk each action-buttons div (one per assistant response)
       and click its copy button. */
    const actionDivs = document.querySelectorAll('.action-buttons');

    if (actionDivs.length > 0) {
        /* First, try to gather user messages too.
           Grok's responses are in .response-content-markdown blocks.
           We find all response blocks and interleave with user queries. */

        /* Collect all user/assistant turns in DOM order */
        const allBlocks = document.querySelectorAll('.response-content-markdown, [class*="user-message"], [class*="query"]');

        /* Iterate each action-buttons div (one per assistant turn) and click copy */
        for (let i = 0; i < actionDivs.length; i++) {
            const actions = actionDivs[i];
            let copyBtn = null;

            /* Try selector-based approach first */
            for (const sel of selectors) {
                copyBtn = actions.querySelector(sel);
                if (copyBtn) break;
            }

            /* Fallback: scan buttons for copy-like label */
            if (!copyBtn) {
                const buttons = actions.querySelectorAll('button');
                for (const btn of buttons) {
                    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                    if (label.includes('copy')) {
                        copyBtn = btn; break;
                    }
                }
            }

            if (copyBtn) {
                await navigator.clipboard.writeText('');
                copyBtn.click();
                await new Promise(r => setTimeout(r, 300));
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim().length > 0) {
                        conversation.push(`## Response ${i + 1}\n${text.trim()}`);
                    }
                } catch (e) {
                    /* Fallback: get text from adjacent markdown div */
                    const parent = actions.closest('[class*="message"]') || actions.parentElement;
                    const md = parent?.querySelector('.response-content-markdown');
                    if (md) conversation.push(`## Response ${i + 1}\n${md.innerText?.trim()}`);
                }
            } else {
                /* No copy button — extract text directly */
                const parent = actions.closest('[class*="message"]') || actions.parentElement;
                const md = parent?.querySelector('.response-content-markdown');
                if (md) conversation.push(`## Response ${i + 1}\n${md.innerText?.trim()}`);
            }

            await new Promise(r => setTimeout(r, 100)); /* brief pause between clicks */
        }
    }

    /* ── 2. Fallback: extract all markdown divs directly ──────── */
    if (conversation.length === 0) {
        const markdownDivs = document.querySelectorAll('.response-content-markdown');
        if (markdownDivs.length === 0) {
            /* Last resort: try copy buttons at top level */
            let copyButtons = [];
            for (const sel of selectors) {
                copyButtons = document.querySelectorAll(sel);
                if (copyButtons.length > 0) break;
            }
            if (copyButtons.length === 0) return null;

            for (let i = 0; i < copyButtons.length; i++) {
                await navigator.clipboard.writeText('');
                copyButtons[i].click();
                await new Promise(r => setTimeout(r, 300));
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim().length > 0) {
                        conversation.push(`## Response ${i + 1}\n${text.trim()}`);
                    }
                } catch (e) { /* skip */ }
            }
        } else {
            for (let i = 0; i < markdownDivs.length; i++) {
                const text = markdownDivs[i].innerText?.trim();
                if (text) conversation.push(`## Response ${i + 1}\n${text}`);
            }
        }
    }

    if (conversation.length === 0) return null;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); } catch (e) { }
    return result;
})()
