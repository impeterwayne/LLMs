import { BrowserWindow, WebPreferences, WebContentsView } from "electron"; // Added WebPreferences type
import { applyCustomStyles } from "./customStyles.js";
import { DEVTOOLS_AUTO_OPEN } from "./config.js";
import { getProvider } from "./providers/registry.js";

// Re-export SerializedFile so main.ts import doesn't break
export type { SerializedFile } from "./providers/types.js";

export interface CustomBrowserView extends WebContentsView {
  id?: string; // Make id optional as it's assigned after creation
}

// Control whether to auto-open DevTools on startup.
// Edit src/config.ts (DEVTOOLS_AUTO_OPEN) for build-time control.
// Or set env var ELECTRON_OPEN_DEVTOOLS_ON_STARTUP=true (runtime override).
const OPEN_DEVTOOLS_ON_STARTUP =
  DEVTOOLS_AUTO_OPEN ||
  (process.env.ELECTRON_OPEN_DEVTOOLS_ON_STARTUP ?? "").toLowerCase() ===
  "true" ||
  (process.env.SHOW_DEVTOOLS ?? "").toLowerCase() === "true";

export function ensureDetachedDevTools(view: CustomBrowserView): void {
  // If disabled, do nothing so DevTools can be opened manually later.
  if (!OPEN_DEVTOOLS_ON_STARTUP) return;

  const devToolsEvents = [
    "did-finish-load",
    "dom-ready",
    "did-frame-finish-load",
  ] as const;

  let devToolsRetryInterval: NodeJS.Timeout | undefined;

  const startDevToolsRetryInterval = () => {
    if (!devToolsRetryInterval) {
      devToolsRetryInterval = setInterval(() => {
        attemptOpenDevTools();
      }, 1000);
    }
  };

  const stopDevToolsRetryInterval = () => {
    if (devToolsRetryInterval) {
      clearInterval(devToolsRetryInterval);
      devToolsRetryInterval = undefined;
    }
  };

  const attemptOpenDevTools = () => {
    if (view.webContents.isDestroyed()) {
      stopDevToolsRetryInterval();
      return;
    }

    if (view.webContents.isDevToolsOpened()) {
      stopDevToolsRetryInterval();
      return;
    }

    startDevToolsRetryInterval();

    try {
      view.webContents.openDevTools({ mode: "detach" });
    } catch (error) {
      console.warn("Failed to open devtools for view", view.id, error);
    }
  };

  const handleLifecycleEvent = () => {
    attemptOpenDevTools();
  };

  const handleDevToolsOpened = () => {
    stopDevToolsRetryInterval();
  };

  const handleDevToolsClosed = () => {
    startDevToolsRetryInterval();
    attemptOpenDevTools();
  };

  devToolsEvents.forEach((event) => {
    view.webContents.on(event as unknown as any, handleLifecycleEvent);
  });

  view.webContents.on("devtools-opened", handleDevToolsOpened);
  view.webContents.on("devtools-closed", handleDevToolsClosed);

  view.webContents.once("destroyed", () => {
    devToolsEvents.forEach((event) => {
      view.webContents.removeListener(
        event as unknown as any,
        handleLifecycleEvent as unknown as (...args: unknown[]) => void,
      );
    });
    view.webContents.removeListener("devtools-opened", handleDevToolsOpened);
    view.webContents.removeListener("devtools-closed", handleDevToolsClosed);
    stopDevToolsRetryInterval();
  });

  attemptOpenDevTools();
}

/**
 * Creates and configures a new BrowserView for the main window
 * @param mainWindow - The main Electron window
 * @param url - The URL to load in the browser view
 * @param websites - Array of currently open website URLs
 * @param views - Array of currently open BrowserViews
 * @param webPreferences - Optional web preferences for the BrowserView
 * @returns The newly created BrowserView
 */
export function addBrowserView(
  mainWindow: BrowserWindow,
  url: string,
  websites: string[],
  views: CustomBrowserView[],
  options: { webPreferences?: WebPreferences; promptAreaHeight?: number; sidebarWidth?: number } = {},
): CustomBrowserView {
  const { webPreferences = {}, promptAreaHeight = 0, sidebarWidth = 0 } = options;

  const view: CustomBrowserView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      ...webPreferences,
    },
  });

  view.id = url;
  mainWindow.contentView.addChildView(view);

  const { width, height } = mainWindow.getContentBounds();
  const availableHeight = Math.max(height - promptAreaHeight, 0);
  const offset = Math.ceil(Math.max(0, sidebarWidth));

  websites.push(url);
  const availableWidth = Math.max(width - offset, 0);
  const viewWidth = Math.floor(availableWidth / websites.length);

  views.forEach((v, index) => {
    v.setBounds({
      x: offset + index * viewWidth,
      y: 0,
      width: viewWidth,
      height: availableHeight,
    });
  });

  view.setBounds({
    x: offset + (websites.length - 1) * viewWidth,
    y: 0,
    width: viewWidth,
    height: availableHeight,
  });

  view.webContents.setZoomFactor(1.5);
  applyCustomStyles(view.webContents);
  view.webContents.loadURL(url);

  ensureDetachedDevTools(view);

  views.push(view);
  return view;
}

export function removeBrowserView(
  mainWindow: BrowserWindow,
  viewToRemove: CustomBrowserView,
  websites: string[],
  views: CustomBrowserView[],
  options: { promptAreaHeight?: number; sidebarWidth?: number } = {},
): void {
  const { promptAreaHeight = 0, sidebarWidth = 0 } = options;

  const viewIndex = views.indexOf(viewToRemove);
  if (viewIndex === -1) return;

  mainWindow.contentView.removeChildView(viewToRemove);

  const urlIndex = websites.findIndex((url) => url === viewToRemove.id);
  if (urlIndex !== -1) {
    websites.splice(urlIndex, 1);
  }

  views.splice(viewIndex, 1);

  if (views.length === 0) return;

  const { width, height } = mainWindow.getContentBounds();
  const availableHeight = Math.max(height - promptAreaHeight, 0);
  const offset = Math.ceil(Math.max(0, sidebarWidth));
  const availableWidth = Math.max(width - offset, 0);
  const viewWidth = Math.floor(availableWidth / views.length);

  views.forEach((v, index) => {
    v.setBounds({
      x: offset + index * viewWidth,
      y: 0,
      width: viewWidth,
      height: availableHeight,
    });
  });
}

// ─── Provider-based interactions ─────────────────────────────

/**
 * Inject a prompt into the view's editor.
 * Delegates to the appropriate provider based on the view's URL.
 */
export function injectPromptIntoView(
  view: CustomBrowserView,
  prompt: string,
): void {
  const provider = getProvider(view.id);
  if (!provider) {
    console.warn(`[LLM-God] No provider found for: ${view.id}`);
    return;
  }

  if (provider.focusBeforeInject) {
    view.webContents.focus();
  }

  const script = provider.buildInjectScript(prompt);
  view.webContents.executeJavaScript(script).catch((err: Error) => {
    console.warn(`[${provider.id}] Inject script error:`, err.message);
  });
}

/**
 * Click the send/submit button in the view.
 * Delegates to the appropriate provider based on the view's URL.
 */
export function sendPromptInView(view: CustomBrowserView) {
  const provider = getProvider(view.id);
  if (!provider) {
    console.warn(`[LLM-God] No provider found for: ${view.id}`);
    return;
  }

  if (provider.focusBeforeSend) {
    view.webContents.focus();
  }

  view.webContents.executeJavaScript(provider.buildSendScript()).catch((err: Error) => {
    console.warn(`[${provider.id}] Send script error:`, err.message);
  });
}

/**
 * Simulate file upload/drop in the view.
 * Delegates to the appropriate provider; falls back to generic DnD.
 */
export async function simulateFileDropInView(
  view: CustomBrowserView,
  files: import("./providers/types.js").SerializedFile[],
): Promise<void> {
  if (!files.length) return;

  const provider = getProvider(view.id);

  if (provider?.buildFileDropScript) {
    // Provider has specialized file drop logic
    const script = provider.buildFileDropScript(files);
    await view.webContents.executeJavaScript(script, true).catch((error) => {
      console.error(`[${provider.id}] File drop failed:`, error);
    });
    return;
  }

  // Generic fallback for providers without specialized file drop
  const genericScript = `
    (async (files) => {
      try {
        const decodeBase64 = (base64) => {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        };
        const createFile = (file) => {
          const bytes = decodeBase64(file.data);
          return new File([bytes], file.name || "dropped-file", {
            type: file.type || "application/octet-stream",
            lastModified: file.lastModified || Date.now(),
          });
        };
        const generatedFiles = files.map(createFile);
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        const buildDataTransfer = () => {
          const dt = new DataTransfer();
          generatedFiles.forEach(f => dt.items.add(f));
          return dt;
        };

        const target = document.querySelector('form') || document.body;
        if (!target) { console.error('[LLM-God] No drop target'); return false; }

        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const handlers = new Map();
        const handler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) try { e.dataTransfer.dropEffect = 'copy'; } catch {}
        };
        ['dragenter', 'dragover'].forEach(type => {
          handlers.set(type, handler);
          target.addEventListener(type, handler, { capture: true });
          document.addEventListener(type, handler, { capture: true });
        });

        const createDragEvent = (type) => {
          const dt = buildDataTransfer();
          try { Object.defineProperty(dt, 'types', { value: ['Files'] }); } catch {}
          try { dt.effectAllowed = 'all'; } catch {}
          if (type === 'dragover' || type === 'drop') try { dt.dropEffect = 'copy'; } catch {}
          const ev = new DragEvent(type, {
            bubbles: true, cancelable: true, composed: true,
            dataTransfer: dt, clientX: x, clientY: y, view: window
          });
          try { Object.defineProperty(ev, 'dataTransfer', { value: dt }); } catch {}
          return ev;
        };

        document.dispatchEvent(createDragEvent('dragenter'));
        await wait(30);
        target.dispatchEvent(createDragEvent('dragenter'));
        await wait(30);
        for (let i = 0; i < 5; i++) {
          document.dispatchEvent(createDragEvent('dragover'));
          await wait(20);
          target.dispatchEvent(createDragEvent('dragover'));
          await wait(20);
        }
        target.dispatchEvent(createDragEvent('drop'));
        await wait(100);
        target.dispatchEvent(createDragEvent('dragend'));
        document.dispatchEvent(createDragEvent('dragend'));
        await wait(100);
        target.dispatchEvent(new Event('dragleave', { bubbles: true }));
        document.dispatchEvent(new Event('dragleave', { bubbles: true }));

        handlers.forEach((h, type) => {
          target.removeEventListener(type, h, { capture: true });
          document.removeEventListener(type, h, { capture: true });
        });

        console.log('[LLM-God] ✓ Generic file drop complete');
        return true;
      } catch (error) {
        console.error('[LLM-God] Fatal error:', error);
        return false;
      }
    })(${JSON.stringify(files)});
  `;

  await view.webContents.executeJavaScript(genericScript, true).catch((error) => {
    console.error("Failed to execute generic drag-and-drop simulation", error);
  });
}

/**
 * Copy the latest answer from a view.
 * Returns the copied text, "__COPIED__" if copy was triggered but clipboard
 * couldn't be read, or null if copy failed.
 */
export async function copyAnswerFromView(view: CustomBrowserView): Promise<string | null> {
  try {
    const provider = getProvider(view.id);
    if (!provider?.buildCopyScript) {
      return null;
    }

    const script = provider.buildCopyScript();
    const result = await view.webContents.executeJavaScript(script);

    // Normalize result across providers
    if (result === true) {
      return "__COPIED__";
    }
    if (result === false || result === null || result === undefined) {
      return null;
    }
    if (result === '__CLIPBOARD_READ_FAILED__') {
      return "__COPIED__";
    }
    // Got actual clipboard text
    return result;
  } catch (error) {
    console.error("Failed to copy answer from view:", view.id, error);
    return null;
  }
}
