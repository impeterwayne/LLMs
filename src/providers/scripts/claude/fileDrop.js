/* Claude — File upload via input assignment + DnD fallback */
(async (rawFiles) => {
    try {
        console.log('[Claude] Starting file upload...');
        const generatedFiles = __createFiles(rawFiles);

        // Strategy 1: File input (prefer last non-disabled input)
        try {
            const findBestInput = () => {
                const inputs = document.querySelectorAll('input[type="file"]');
                if (inputs.length === 0) return null;
                for (let i = inputs.length - 1; i >= 0; i--) {
                    if (!inputs[i].disabled) return inputs[i];
                }
                return inputs[inputs.length - 1];
            };

            let targetInput = findBestInput();
            if (!targetInput) {
                targetInput = await __waitForElement('input[type="file"]', { timeout: 10000 });
            }

            if (targetInput) {
                const ok = await __assignToFileInput(targetInput, generatedFiles);
                if (ok) {
                    await __wait(100);
                    console.log('[Claude] ✓ File upload via input');
                    return true;
                }
            }
        } catch (inputError) {
            console.log('[Claude] File input failed:', inputError.message, '— trying DnD fallback...');
        }

        // Strategy 2: Drag-and-drop fallback
        const dropZone = __findFirst(__DROP_ZONE_SELECTORS__);
        const ok = await __simulateDnD(dropZone, generatedFiles);
        if (ok) console.log('[Claude] ✓ File upload via DnD');
        return ok;
    } catch (e) { console.error('[Claude] Fatal:', e); return false; }
})(__FILES__);
