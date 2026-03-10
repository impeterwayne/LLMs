/* ChatGPT — Copy full conversation (all turns) to clipboard */
(async () => {
    const selectors = __SELECTORS__;
    const conversation = [];

    /* ── 1. Gather all turn containers ─────────────────────────── */
    const turns = document.querySelectorAll('[data-message-author-role]');
    if (turns.length === 0) {
        /* Fallback: old approach — click last copy button */
        let copyButtons = [];
        for (const sel of selectors) {
            copyButtons = document.querySelectorAll(sel);
            if (copyButtons.length > 0) break;
        }
        if (copyButtons.length === 0) return null;
        const lastBtn = copyButtons[copyButtons.length - 1];
        const parent = lastBtn.closest('div[class*="group"]') || lastBtn.parentElement;
        if (parent) {
            parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(r => setTimeout(r, 200));
        }
        lastBtn.click();
        await new Promise(r => setTimeout(r, 300));
        try { return await navigator.clipboard.readText(); }
        catch (e) { return '__CLIPBOARD_READ_FAILED__'; }
    }

    /* ── 2. For each turn, extract text ───────────────────────── */
    for (const turn of turns) {
        const role = turn.getAttribute('data-message-author-role');
        const label = role === 'user' ? '## User' : '## Assistant';

        if (role === 'user') {
            /* User messages are plain text — innerText is fine */
            const userText = turn.innerText?.trim();
            if (userText) {
                conversation.push(label + '\n' + userText);
            }
            continue;
        }

        /* Assistant turn: try to click its copy button for formatted markdown */
        let copied = null;
        const turnContainer = turn.closest('[data-testid*="conversation-turn"]') || turn.parentElement?.parentElement;
        if (turnContainer) {
            let copyBtn = null;
            for (const sel of selectors) {
                copyBtn = turnContainer.querySelector(sel);
                if (copyBtn) break;
            }

            if (copyBtn) {
                /* Hover to reveal hidden buttons */
                const parent = copyBtn.closest('div[class*="group"]') || copyBtn.parentElement;
                if (parent) {
                    parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    await new Promise(r => setTimeout(r, 150));
                }
                await navigator.clipboard.writeText('');
                copyBtn.click();
                await new Promise(r => setTimeout(r, 300));
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim().length > 0) copied = text.trim();
                } catch (e) { /* clipboard read failed, fall through */ }
            }
        }

        /* Fallback: extract innerText if copy button approach failed */
        if (!copied) {
            const markdown = turn.querySelector('.markdown') || turn.querySelector('[class*="markdown"]');
            const text = (markdown || turn).innerText?.trim();
            if (text) copied = text;
        }

        if (copied) {
            conversation.push(label + '\n' + copied);
        }
    }

    if (conversation.length === 0) return null;

    const result = conversation.join('\n\n---\n\n');
    try { await navigator.clipboard.writeText(result); }
    catch (e) { /* best effort */ }
    return result;
})()
