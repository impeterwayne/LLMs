/**
 * Provider system types for LLM-God.
 *
 * Each LLM website (ChatGPT, Gemini, Claude, etc.) has a Provider that
 * encapsulates the platform-specific DOM knowledge.
 *
 * The key design principle: SELECTORS (fragile, change often) are separated
 * from STRATEGIES (stable interaction patterns like Quill/Lexical/ProseMirror).
 */

export interface SerializedFile {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    data: string;
}

export interface Provider {
    /** Unique identifier for this provider (e.g. "chatgpt", "gemini") */
    readonly id: string;

    /** Test whether a URL belongs to this provider */
    matchUrl(url: string): boolean;

    /**
     * Generate JavaScript to inject a prompt into the editor.
     * The returned string is executed via webContents.executeJavaScript().
     */
    buildInjectScript(prompt: string): string;

    /**
     * Generate JavaScript to click the send/submit button.
     * The returned string is executed via webContents.executeJavaScript().
     */
    buildSendScript(): string;

    /**
     * Generate JavaScript to simulate file upload/drop.
     * Return null if file drop is not supported by this provider.
     */
    buildFileDropScript?(files: SerializedFile[]): string;

    /**
     * Generate JavaScript to copy the latest answer/response.
     * Return null if copy is not supported by this provider.
     */
    buildCopyScript?(): string;

    /** Whether to call webContents.focus() before injecting a prompt */
    focusBeforeInject?: boolean;

    /** Whether to call webContents.focus() before sending */
    focusBeforeSend?: boolean;

    /**
     * CSS selectors for the editor element. The command pipeline will poll
     * for one of these to appear before executing the inject script.
     * If empty/undefined, pipeline skips the poll step.
     */
    editorSelectors?: string[];

    /**
     * CSS selectors for the send button. The command pipeline will poll
     * for one of these to appear before executing the send script.
     * If empty/undefined, pipeline skips the poll step.
     */
    sendButtonSelectors?: string[];

    /**
     * When true, the pipeline will use Electron's native sendInputEvent
     * to press Enter on the editor instead of executing the send script.
     * This produces trusted events that pass isTrusted checks in React/Radix.
     * Useful for providers like Perplexity that reject synthetic DOM events.
     */
    useNativeEnterToSend?: boolean;
}
