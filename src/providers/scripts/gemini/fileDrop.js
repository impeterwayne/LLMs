/* Gemini — File upload with 3-tier strategy: input, paste, DnD */
(async (rawFiles) => {
    try {
        const generatedFiles = __createFiles(rawFiles);
        const sig = generatedFiles.map(f => `${f.name}:${f.size}:${f.lastModified}`).join('|');
        const now = Date.now();
        const lockKey = '__LLM_GOD_GEMINI_LOCK__';

        // De-dupe (5s window)
        try {
            const lock = window[lockKey];
            if (lock && lock.sig === sig && (now - lock.ts) < 5000) {
                console.log('[Gemini] Duplicate upload suppressed');
                return true;
            }
            window[lockKey] = { sig, ts: now };
            setTimeout(() => { const l = window[lockKey]; if (l && l.sig === sig) l.ts = 0; }, 6000);
        } catch { }

        // Build shared DataTransfer
        const dt = new DataTransfer();
        generatedFiles.forEach(f => dt.items.add(f));
        for (const item of dt.items) {
            if (!('webkitGetAsEntry' in item)) {
                try {
                    Object.defineProperty(item, 'webkitGetAsEntry', {
                        value: () => ({
                            isFile: true, isDirectory: false,
                            file: (cb) => cb(item.getAsFile()),
                            name: item.getAsFile()?.name || 'file',
                        }),
                        configurable: true,
                    });
                } catch { }
            }
        }

        // Deep search for file inputs
        const enumerateRoots = () => {
            const roots = [document]; const seen = new Set();
            const push = (root) => {
                if (!root || seen.has(root)) return;
                seen.add(root); roots.push(root);
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let n; while ((n = walker.nextNode())) {
                    const el = n;
                    if (el.shadowRoot) push(el.shadowRoot);
                    if (el.tagName === 'IFRAME') { try { if (el.contentDocument) push(el.contentDocument); } catch { } }
                }
            };
            push(document); return roots;
        };
        const findAnyFileInput = () => {
            for (const root of enumerateRoots()) {
                const q = root.querySelector?.('input[type="file"]');
                if (q) return q;
            }
            return null;
        };

        // Strategy 1: File input assignment
        const deadline = Date.now() + 5000;
        let input = findAnyFileInput();
        while (!input && Date.now() < deadline) { await __wait(120); input = findAnyFileInput(); }
        if (input) {
            const ok = await __assignToFileInput(input, generatedFiles);
            if (ok) { console.log('[Gemini] ✓ Upload via file input'); return true; }
        }

        // Strategy 2: Paste fallback
        const pasteTargets = __PASTE_SELECTORS__;
        const pasteTarget = __findFirst(pasteTargets)
            || document.activeElement || document.querySelector('form') || document.body;
        const dispatchPaste = (el) => {
            if (!el) return false;
            try { el.focus?.(); } catch { }
            let ev;
            try { ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }); }
            catch { ev = new Event('paste', { bubbles: true, cancelable: true }); }
            try { Object.defineProperty(ev, 'clipboardData', { value: dt }); } catch { }
            return el.dispatchEvent(ev);
        };
        if (dispatchPaste(pasteTarget)) {
            console.log('[Gemini] ✓ Paste fallback dispatched');
            return true;
        }

        // Strategy 3: DnD fallback
        const dropTargets = __DROP_SELECTORS__;
        const target = __findFirst(dropTargets) || document.body;
        const preventDragover = (e) => {
            e.preventDefault();
            if (e.dataTransfer) try { e.dataTransfer.dropEffect = 'copy'; } catch { }
        };
        document.addEventListener('dragover', preventDragover, { capture: true });
        target.addEventListener('dragover', preventDragover, { capture: true });
        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        const mk = (type) => {
            const ev = new DragEvent(type, {
                bubbles: true, cancelable: true, composed: true,
                clientX: x, clientY: y, dataTransfer: dt, view: window
            });
            try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch { }
            try {
                dt.effectAllowed = 'all';
                if (type === 'dragover' || type === 'drop') dt.dropEffect = 'copy';
            } catch { }
            return ev;
        };
        document.dispatchEvent(mk('dragenter')); await __wait(25);
        target.dispatchEvent(mk('dragenter')); await __wait(25);
        for (let i = 0; i < 4; i++) {
            document.dispatchEvent(mk('dragover')); await __wait(18);
            target.dispatchEvent(mk('dragover')); await __wait(18);
        }
        target.dispatchEvent(mk('drop')); await __wait(100);
        document.dispatchEvent(mk('dragend'));
        document.removeEventListener('dragover', preventDragover, { capture: true });
        target.removeEventListener('dragover', preventDragover, { capture: true });
        console.log('[Gemini] ✓ DnD fallback completed');
        return true;
    } catch (e) { console.error('[Gemini] Fatal:', e); return false; }
})(__FILES__);
