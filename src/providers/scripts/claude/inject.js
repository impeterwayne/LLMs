/* Claude — Inject prompt into ProseMirror editor */
(async (prompt) => {
    try {
        console.log('[Claude] Waiting for editor...');
        const inputElement = await __waitForElement('__EDITOR_SELECTOR__');
        console.log('[Claude] Editor ready!');
        inputElement.innerHTML = prompt;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Claude] Prompt injected via ProseMirror');
    } catch (error) {
        console.error('[Claude] Failed to inject prompt:', error);
    }
})(__PROMPT__);
