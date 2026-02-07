/* ChatGPT — File drop via drag-and-drop simulation */
(async (rawFiles) => {
    try {
        const generatedFiles = __createFiles(rawFiles);
        const target = __findFirst(__SELECTORS__);
        const ok = await __simulateDnD(target, generatedFiles);
        if (ok) console.log('[ChatGPT] ✓ File drop complete');
        else console.error('[ChatGPT] ❌ File drop failed');
        return ok;
    } catch (e) { console.error('[ChatGPT] Fatal:', e); return false; }
})(__FILES__);
