/* Perplexity — File upload via input assignment */
(async (rawFiles) => {
    try {
        console.log('[Perplexity] Starting file upload...');
        const generatedFiles = __createFiles(rawFiles);
        const fileInput = await __waitForElement('input[type="file"]');
        console.log('[Perplexity] File input ready!');
        const ok = await __assignToFileInput(fileInput, generatedFiles);
        if (ok) { await __wait(200); console.log('[Perplexity] ✓ File upload complete'); }
        else console.error('[Perplexity] ❌ File upload failed');
        return ok;
    } catch (error) {
        console.error('[Perplexity] ❌ File upload error:', error);
        return false;
    }
})(__FILES__);
