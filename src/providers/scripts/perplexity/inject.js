/* Perplexity — Inject prompt into Lexical editor */
(async (prompt) => {
    try {
        console.log('[Perplexity] Waiting for editor...');
        const editorElement = await __waitForElement(
            '__EDITOR_ID__',
            { checkFn: (el) => el.__lexicalEditor || el.tagName === 'TEXTAREA' }
        );
        console.log('[Perplexity] Editor ready!');

        if (editorElement && editorElement.__lexicalEditor) {
            const editor = editorElement.__lexicalEditor;
            console.log('[Perplexity] Using Lexical editor');

            // Use Lexical's update() API so all registered listeners fire
            // (including Perplexity's onChange that enables the submit button).
            editor.update(() => {
                // Access Lexical internals from within the update closure
                const root = window.__lexicalGetRoot
                    ? window.__lexicalGetRoot()
                    : editor.getEditorState()._nodeMap.get('root');

                // Clear existing content first
                if (root && root.clear) {
                    root.clear();
                }

                // Build the new state externally and set it
                const newState = {
                    root: {
                        children: [{
                            children: [{
                                detail: 0, format: 0, mode: 'normal', style: '',
                                text: prompt, type: 'text', version: 1,
                            }],
                            direction: 'ltr', format: '', indent: 0,
                            type: 'paragraph', version: 1,
                        }],
                        direction: 'ltr', format: '', indent: 0,
                        type: 'root', version: 1,
                    },
                };
                const editorState = editor.parseEditorState(JSON.stringify(newState));
                editor.setEditorState(editorState);
            });

            // Also dispatch input event to trigger any non-Lexical listeners
            const targetElement = editorElement.querySelector('__EDITOR_TEXTBOX__') || editorElement;
            targetElement.dispatchEvent(new InputEvent('input', {
                bubbles: true, cancelable: true, inputType: 'insertText', data: prompt,
            }));

            // Dispatch paste event as additional trigger
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', prompt);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer, bubbles: true, cancelable: true, composed: true,
            });
            targetElement.dispatchEvent(pasteEvent);

            console.log('[Perplexity] Prompt injected via Lexical');
        } else if (editorElement) {
            // Textarea fallback
            console.log('[Perplexity] Using textarea fallback');
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            )?.set;
            setter?.call(editorElement, prompt);
            editorElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } catch (error) {
        console.error('[Perplexity] Failed to inject prompt:', error);
    }
})(__PROMPT__);
