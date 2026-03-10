/* Claude — Copy full conversation (all turns) via action bar buttons */
(async () => {
    const copySelectors = __COPY_SELECTORS__;
    const conversation = [];

    /* ── 1. Find all message blocks ──────────────────────────── */
    /* Claude wraps each message in a container with role indicators.
       The user messages use .font-user-message, assistant messages
       use .font-claude-message. Both live in a scrollable conversation. */
    const allMessages = document.querySelectorAll('[data-testid^="chat-message-"]');

    if (allMessages.length === 0) {
        /* Fallback to old approach */
        const copyButtons = document.querySelectorAll(copySelectors);
        if (copyButtons.length === 0) return null;
        const lastCopyBtn = copyButtons[copyButtons.length - 1];
        lastCopyBtn.click();
        await new Promise(r => setTimeout(r, 300));
        try { return await navigator.clipboard.readText(); }
        catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
    }

    for (const msg of allMessages) {
        const testId = msg.getAttribute('data-testid') || '';
        const isUser = testId.includes('user') || msg.querySelector('.font-user-message');

        if (isUser) {
            const userText = msg.innerText?.trim();
            if (userText) conversation.push('## User\n' + userText);
            continue;
        }

        /* Assistant message: try to click its copy button */
        let copied = null;
        const copyBtn = msg.querySelector(copySelectors);
        if (copyBtn) {
            await navigator.clipboard.writeText('');
            copyBtn.click();
            await new Promise(r => setTimeout(r, 300));
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().length > 0) copied = text.trim();
            } catch (e) { /* fall through */ }
        }

        if (!copied) {
            /* Fallback: extract text from the message body */
            const body = msg.querySelector('.font-claude-message') || msg.querySelector('[class*="prose"]') || msg;
            const text = body.innerText?.trim();
            if (text) copied = text;
        }

        if (copied) conversation.push('## Assistant\n' + copied);
    }

    /* ── 2. Broader fallback: iterate all copy buttons if no data-testid ── */
    if (conversation.length === 0) {
        const copyButtons = document.querySelectorAll(copySelectors);
        const results = [];
        for (const btn of copyButtons) {
            await navigator.clipboard.writeText('');
            btn.click();
            await new Promise(r => setTimeout(r, 300));
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().length > 0) results.push(text.trim());
            } catch (e) { /* skip */ }
        }
        if (results.length === 0) return null;
        const result = results.map((r, i) => `## Response ${i + 1}\n${r}`).join('\n\n---\n\n');
        try { await navigator.clipboard.writeText(result); } catch (e) { }
        return result;
    }

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); } catch (e) { }
    return result;
})()
