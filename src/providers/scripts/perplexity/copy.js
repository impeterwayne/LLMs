/* Perplexity — Copy full conversation (all answer blocks) */
(async () => {
    const copySelector = __COPY_SELECTOR__;
    const conversation = [];

    /* ── 1. Find all copy buttons and click each one ─────────── */
    const copyButtons = document.querySelectorAll(copySelector);

    if (copyButtons.length > 0) {
        for (let i = 0; i < copyButtons.length; i++) {
            await navigator.clipboard.writeText('');
            copyButtons[i].click();
            await new Promise(r => setTimeout(r, 300));
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().length > 0) {
                    conversation.push(`## Response ${i + 1}\n${text.trim()}`);
                }
            } catch (e) { /* skip this turn */ }
        }
    }

    /* ── 2. Fallback: extract text from answer blocks ────────── */
    if (conversation.length === 0) {
        /* Perplexity uses .prose for answer blocks */
        const answerBlocks = document.querySelectorAll('.prose, [class*="answer-content"]');
        for (let i = 0; i < answerBlocks.length; i++) {
            const text = answerBlocks[i].innerText?.trim();
            if (text) conversation.push(`## Response ${i + 1}\n${text}`);
        }
    }

    if (conversation.length === 0) return false;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); } catch (e) { }
    return result;
})()
