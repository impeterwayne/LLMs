/**
 * Command Pipeline — Ensures page readiness before executing provider scripts.
 *
 * Problem: inject/send scripts fire immediately via executeJavaScript, but the
 * page may not have loaded its editor DOM yet (fresh session restore, SPA
 * navigation, slow hydration).  Scripts silently fail with "element not found".
 *
 * Solution: A pipeline that:
 *  1. Waits for the webContents to finish loading (did-finish-load / readyState)
 *  2. Polls for the provider's editor element to appear in the DOM
 *  3. Only then injects the prompt
 *  4. Optionally waits again for the send button to appear, then clicks it
 *
 * This replaces the old fire-and-forget pattern and the hardcoded setTimeout
 * hacks scattered throughout main.ts.
 */
import { WebContents } from "electron";

interface CustomBrowserView {
    id?: string;
    webContents: WebContents;
}

// ─── Page Readiness ──────────────────────────────────────────────

/**
 * JavaScript snippet that resolves when the page is interactive.
 * Handles both initial loads and SPA navigations where readyState
 * may already be "complete" but the framework hasn't hydrated yet.
 */
const JS_WAIT_PAGE_READY = `
new Promise((resolve) => {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    resolve(true);
    return;
  }
  const onReady = () => {
    document.removeEventListener('DOMContentLoaded', onReady);
    window.removeEventListener('load', onReady);
    resolve(true);
  };
  document.addEventListener('DOMContentLoaded', onReady);
  window.addEventListener('load', onReady);
  // Safety timeout — don't block forever
  setTimeout(() => resolve(true), 15000);
});
`;

/**
 * Wait for the webContents to reach a "ready" state.
 * If it's currently loading, we wait for did-finish-load.
 * Then we also run a JS check to ensure the DOM is interactive.
 */
async function waitForPageReady(
    wc: WebContents,
    timeoutMs = 15000,
): Promise<void> {
    // 1. Wait for Electron's loading to finish
    if (wc.isLoadingMainFrame()) {
        await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
                wc.removeListener("did-finish-load", onLoad);
                wc.removeListener("did-fail-load", onFail);
                resolve();
            }, timeoutMs);

            const onLoad = () => {
                clearTimeout(timer);
                wc.removeListener("did-fail-load", onFail);
                resolve();
            };
            const onFail = () => {
                clearTimeout(timer);
                wc.removeListener("did-finish-load", onLoad);
                resolve();
            };

            wc.once("did-finish-load", onLoad);
            wc.once("did-fail-load", onFail);
        });
    }

    // 2. Wait for DOM to be interactive
    try {
        await wc.executeJavaScript(JS_WAIT_PAGE_READY);
    } catch {
        // Page may have navigated away — that's fine
    }
}

// ─── Element Polling ─────────────────────────────────────────────

/**
 * Build a JS snippet that polls for any of the given selectors to appear.
 * Returns the found element's outer tag name (truthy) or throws on timeout.
 */
function buildPollScript(
    selectors: string[],
    timeoutMs = 10000,
    intervalMs = 200,
): string {
    return `
    (function() {
      var selectors = ${JSON.stringify(selectors)};
      var timeout = ${timeoutMs};
      var interval = ${intervalMs};
      return new Promise(function(resolve, reject) {
        var elapsed = 0;
        function poll() {
          for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) {
              resolve(selectors[i]);
              return;
            }
          }
          elapsed += interval;
          if (elapsed >= timeout) {
            reject(new Error('Pipeline: elements not found after ' + timeout + 'ms: ' + selectors.join(', ')));
            return;
          }
          setTimeout(poll, interval);
        }
        poll();
      });
    })();
  `;
}

// ─── Pipeline Commands ───────────────────────────────────────────

export interface PipelineResult {
    viewId: string;
    success: boolean;
    stage: "page-ready" | "inject" | "send" | "complete";
    error?: string;
}

export interface PipelineOptions {
    /** Max time to wait for page readiness (ms). Default 15000. */
    pageReadyTimeout?: number;
    /** Max time to poll for editor element (ms). Default 10000. */
    elementPollTimeout?: number;
    /** Interval between polls (ms). Default 200. */
    pollInterval?: number;
    /** Delay between inject and send (ms). Default 300. */
    injectToSendDelay?: number;
    /** Selectors to poll for before injecting. If empty, skip polling. */
    editorSelectors?: string[];
    /** Selectors to poll for before sending. If empty, skip polling. */
    sendButtonSelectors?: string[];
    /**
     * Callback to focus the view RIGHT BEFORE script execution.
     * This is critical for providers like Gemini that use execCommand
     * which requires the document to have active focus.
     * Must NOT be called early — only at the exact moment before execution.
     */
    focusFn?: () => void;
}

const DEFAULT_OPTIONS: Required<PipelineOptions> = {
    pageReadyTimeout: 15000,
    elementPollTimeout: 10000,
    pollInterval: 200,
    injectToSendDelay: 300,
    editorSelectors: [],
    sendButtonSelectors: [],
    focusFn: () => { },
};

/**
 * Execute the inject pipeline for a single view:
 *  1. Wait for page ready
 *  2. Poll for editor element
 *  3. Execute inject script
 */
export async function pipelineInject(
    view: CustomBrowserView,
    injectScript: string,
    opts: PipelineOptions = {},
): Promise<PipelineResult> {
    const viewId = view.id || "unknown";
    const options = { ...DEFAULT_OPTIONS, ...opts };

    try {
        // Stage 1: Wait for page
        await waitForPageReady(view.webContents, options.pageReadyTimeout);

        // Stage 2: Poll for editor element
        if (options.editorSelectors.length > 0) {
            try {
                await view.webContents.executeJavaScript(
                    buildPollScript(options.editorSelectors, options.elementPollTimeout, options.pollInterval),
                );
            } catch (err: any) {
                console.warn(`[Pipeline][${viewId}] Editor element poll failed:`, err.message);
                // Continue anyway — the inject script may have its own fallback
            }
        }

        // Stage 3: Focus (just-in-time) + Inject
        if (options.focusFn) options.focusFn();
        await view.webContents.executeJavaScript(injectScript);

        return { viewId, success: true, stage: "inject" };
    } catch (err: any) {
        console.error(`[Pipeline][${viewId}] Inject failed:`, err.message);
        return { viewId, success: false, stage: "inject", error: err.message };
    }
}

/**
 * Execute the send pipeline for a single view:
 *  1. Wait for page ready
 *  2. Poll for send button
 *  3. Execute send script
 */
export async function pipelineSend(
    view: CustomBrowserView,
    sendScript: string,
    opts: PipelineOptions = {},
): Promise<PipelineResult> {
    const viewId = view.id || "unknown";
    const options = { ...DEFAULT_OPTIONS, ...opts };

    try {
        // Stage 1: Wait for page (should be near-instant if inject already ran)
        await waitForPageReady(view.webContents, options.pageReadyTimeout);

        // Stage 2: Poll for send button
        if (options.sendButtonSelectors.length > 0) {
            try {
                await view.webContents.executeJavaScript(
                    buildPollScript(options.sendButtonSelectors, options.elementPollTimeout, options.pollInterval),
                );
            } catch (err: any) {
                console.warn(`[Pipeline][${viewId}] Send button poll failed:`, err.message);
                // Continue — send script may force-enable the button
            }
        }

        // Stage 3: Focus (just-in-time) + Send
        if (options.focusFn) options.focusFn();
        await view.webContents.executeJavaScript(sendScript);

        return { viewId, success: true, stage: "send" };
    } catch (err: any) {
        console.error(`[Pipeline][${viewId}] Send failed:`, err.message);
        return { viewId, success: false, stage: "send", error: err.message };
    }
}

/**
 * Execute the full inject → send pipeline for a single view:
 *  1. Wait for page ready
 *  2. Poll for editor element
 *  3. Execute inject script
 *  4. Brief delay for UI to react
 *  5. Poll for send button
 *  6. Execute send script
 */
export async function pipelineInjectAndSend(
    view: CustomBrowserView,
    injectScript: string,
    sendScript: string,
    opts: PipelineOptions = {},
): Promise<PipelineResult> {
    const viewId = view.id || "unknown";
    const options = { ...DEFAULT_OPTIONS, ...opts };

    // Inject
    const injectResult = await pipelineInject(view, injectScript, options);
    if (!injectResult.success) {
        return injectResult;
    }

    // Delay between inject and send
    await new Promise((r) => setTimeout(r, options.injectToSendDelay));

    // Send
    const sendResult = await pipelineSend(view, sendScript, options);
    if (!sendResult.success) {
        return sendResult;
    }

    return { viewId, success: true, stage: "complete" };
}

/**
 * Run inject across all views in parallel with page readiness.
 * Returns results for each view.
 */
export async function pipelineInjectAll(
    views: CustomBrowserView[],
    buildInjectScript: (view: CustomBrowserView) => string | null,
    opts: PipelineOptions = {},
): Promise<PipelineResult[]> {
    return Promise.all(
        views.map(async (view) => {
            const script = buildInjectScript(view);
            if (!script) {
                return {
                    viewId: view.id || "unknown",
                    success: false,
                    stage: "inject" as const,
                    error: "No inject script for this view",
                };
            }
            return pipelineInject(view, script, opts);
        }),
    );
}

/**
 * Run send across all views in parallel with page readiness.
 */
export async function pipelineSendAll(
    views: CustomBrowserView[],
    buildSendScript: (view: CustomBrowserView) => string | null,
    opts: PipelineOptions = {},
): Promise<PipelineResult[]> {
    return Promise.all(
        views.map(async (view) => {
            const script = buildSendScript(view);
            if (!script) {
                return {
                    viewId: view.id || "unknown",
                    success: false,
                    stage: "send" as const,
                    error: "No send script for this view",
                };
            }
            return pipelineSend(view, script, opts);
        }),
    );
}

/**
 * Run inject+send across all views in parallel with page readiness.
 * This is the main entry point for the Ctrl+Q "paste and go" flow.
 */
export async function pipelineInjectAndSendAll(
    views: CustomBrowserView[],
    buildInjectScript: (view: CustomBrowserView) => string | null,
    buildSendScript: (view: CustomBrowserView) => string | null,
    opts: PipelineOptions = {},
): Promise<PipelineResult[]> {
    return Promise.all(
        views.map(async (view) => {
            const inject = buildInjectScript(view);
            const send = buildSendScript(view);
            if (!inject || !send) {
                return {
                    viewId: view.id || "unknown",
                    success: false,
                    stage: "inject" as const,
                    error: "No script available for this view",
                };
            }
            return pipelineInjectAndSend(view, inject, send, opts);
        }),
    );
}
