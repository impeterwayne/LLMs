/* Google AI Mode — Copy answer via built-in copy button */
(async () => {
    const copySelectors = __COPY_SELECTORS__;

    /* ── 1. Find the copy button ─────────────────────────────── */
    let copyBtn = null;

    /* Strategy A: selector-based (aria-label patterns) */
    copyBtn = __findFirst(copySelectors);

    /* Strategy B: scan all buttons for copy-like aria-label (covers more locales) */
    if (!copyBtn) {
        const allBtns = document.querySelectorAll('button');
        for (const btn of allBtns) {
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            if (label.includes('copy') || label.includes('sao ch') ||
                label.includes('copiar') || label.includes('kopier') ||
                label.includes('コピー') || label.includes('복사') ||
                label.includes('копир') || label.includes('复制') ||
                label.includes('複製')) {
                copyBtn = btn;
                break;
            }
        }
    }

    /* Strategy C: class-based fallback (fragile, but covers edge cases) */
    if (!copyBtn) {
        copyBtn = document.querySelector('button.bKxaof');
    }

    /* Strategy D: first button in the action bar */
    if (!copyBtn) {
        const actionBar = document.querySelector('.YHsVn');
        if (actionBar) {
            copyBtn = actionBar.querySelector('button');
        }
    }

    if (!copyBtn) {
        /* ── Fallback: extract text directly from response container ── */
        const containers = [
            '.DBd2Wb', '.CKgc1d',
            '#aim-chrome-initial-inline-async-container',
            '[data-attrid="wa:/tldr"]',
            '.wDYxhc[data-md]', '.wDYxhc',
            '.ai-overview-card',
        ];
        for (const sel of containers) {
            const el = document.querySelector(sel);
            if (el) {
                const text = el.innerText?.trim();
                if (text && text.length > 50) {
                    try { await navigator.clipboard.writeText(text); } catch (e) { }
                    return text;
                }
            }
        }
        return null;
    }

    /* ── 2. Clear clipboard & click the copy button ───────────── */
    try { await navigator.clipboard.writeText(''); } catch (e) { }
    copyBtn.click();

    /* ── 3. Wait for clipboard to populate ────────────────────── */
    await new Promise(r => setTimeout(r, 400));

    /* ── 4. Read clipboard ───────────────────────────────────── */
    try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) return text.trim();
    } catch (e) { /* fall through to innerText fallback */ }

    /* ── 5. Fallback: extract innerText if clipboard read failed ─ */
    const containers = [
        '.DBd2Wb', '.CKgc1d',
        '#aim-chrome-initial-inline-async-container',
    ];
    for (const sel of containers) {
        const el = document.querySelector(sel);
        if (el) {
            const text = el.innerText?.trim();
            if (text && text.length > 50) return text;
        }
    }

    return '__COPIED__';
})()
