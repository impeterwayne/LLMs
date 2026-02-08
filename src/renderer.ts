const ipcRenderer = window.electron.ipcRenderer;
import { initSessionSidebar } from "./sessionSidebar.js";
import { initSettings } from "./settings.js";

let promptArea: HTMLElement | null = null;

interface SerializedFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  data: string;
}

interface ViewLayout {
  id: string;
  url: string;
  bounds: Electron.Rectangle;
  headerBounds: Electron.Rectangle;
}

let currentViewLayouts: ViewLayout[] = [];
let viewHeadersContainer: HTMLElement | null = null;

const removeDragActiveState = (): void => {
  promptArea?.classList.remove("drag-active");
};

const serializeFileForTransfer = (file: File): Promise<SerializedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(result);
        let binary = "";

        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });

        const base64 = btoa(binary);

        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: base64,
        });
        return;
      }

      reject(new Error("Unexpected result while reading file"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};

const handleFileDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  removeDragActiveState();

  const droppedFiles = event.dataTransfer?.files;

  if (!droppedFiles || droppedFiles.length === 0) {
    return;
  }

  try {
    const fileList = Array.from(droppedFiles);
    const serializedFiles = await Promise.all(
      fileList.map((file) => serializeFileForTransfer(file)),
    );

    await ipcRenderer.invoke("broadcast-file-drop", serializedFiles);
  } catch (error) {
    console.error("Error processing dropped files", error);
  }
};

const notifyPromptAreaSize = (): void => {
  if (!promptArea) {
    return;
  }

  const rect = promptArea.getBoundingClientRect();
  // Expose prompt area height as CSS variable for layout (e.g., sidebar bottom)
  try {
    document.documentElement.style.setProperty(
      "--prompt-area-height",
      `${Math.max(0, Math.round(rect.height))}px`,
    );
  } catch { }
  ipcRenderer.send("prompt-area-size", rect.height);
  // New unified measurement so main can also reserve right dock in future
  ipcRenderer.send("ui-chrome-size", { bottom: Math.max(0, Math.round(rect.height)), right: 0 });
};

const initializePromptAreaObserver = (): void => {
  promptArea = document.getElementById("prompt-area");

  if (!promptArea) {
    return;
  }

  promptArea.addEventListener("dragover", (event: DragEvent) => {
    event.preventDefault();
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.dropEffect = "copy";
    promptArea?.classList.add("drag-active");
  });

  promptArea.addEventListener("dragenter", (event: DragEvent) => {
    event.preventDefault();
    promptArea?.classList.add("drag-active");
  });

  promptArea.addEventListener("dragleave", () => {
    removeDragActiveState();
  });

  promptArea.addEventListener("dragend", () => {
    removeDragActiveState();
  });

  promptArea.addEventListener("drop", handleFileDrop);

  window.addEventListener(
    "drop",
    (event: DragEvent) => {
      if (!promptArea?.contains(event.target as Node)) {
        event.preventDefault();
        removeDragActiveState();
      }
    },
    true,
  );

  window.addEventListener(
    "dragover",
    (event: DragEvent) => {
      event.preventDefault();
      if (!promptArea?.classList.contains("drag-active")) {
        event.dataTransfer && (event.dataTransfer.dropEffect = "none");
      }
    },
    true,
  );

  const promptAreaObserver = new ResizeObserver(() => {
    notifyPromptAreaSize();
  });

  promptAreaObserver.observe(promptArea);
  window.addEventListener("resize", notifyPromptAreaSize);
  window.addEventListener("orientationchange", notifyPromptAreaSize);

  notifyPromptAreaSize();
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initializePromptAreaObserver, {
    once: true,
  });
} else {
  initializePromptAreaObserver();
}

export function logToWebPage(message: string): void {
  ipcRenderer.send("enter-prompt", message);
}

export function openClaudeMessage(message: string): void {
  ipcRenderer.send("open-claude", message);
}

export function closeClaudeMessage(message: string): void {
  ipcRenderer.send("close-claude", message);
}

export function openDeepSeekMessage(message: string): void {
  ipcRenderer.send("open-deepseek", message);
}

export function closeDeepSeekMessage(message: string): void {
  ipcRenderer.send("close-deepseek", message);
}

export function openGrokMessage(message: string): void {
  ipcRenderer.send("open-grok", message);
}

export function closeGrokMessage(message: string): void {
  ipcRenderer.send("close-grok", message);
}

const textArea = document.getElementById(
  "prompt-input",
) as HTMLTextAreaElement | null;


// Provider toggle functionality
const providerToggles = document.querySelectorAll<HTMLButtonElement>('.provider-toggle');

const updateProviderToggles = async (): Promise<void> => {
  try {
    const urls = ((await ipcRenderer.invoke("get-current-urls")) ?? []) as string[];
    const activeProviders = urls.map(url => inferProviderFromUrl(url));

    providerToggles.forEach(toggle => {
      const provider = toggle.dataset.provider;
      if (provider && activeProviders.includes(provider)) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    });
  } catch (error) {
    console.error("Failed to update provider toggles", error);
  }
};

const inferProviderFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (/chatgpt\.com|chat\.openai\.com/i.test(host)) return "chatgpt";
    if (/gemini\.google\.com/i.test(host)) return "gemini";
    if (/perplexity\.ai/i.test(host)) return "perplexity";
    if (/claude\.ai/i.test(host)) return "claude";
    if (/grok\.com/i.test(host)) return "grok";
    if (/deepseek\.com/i.test(host)) return "deepseek";
    // Research providers
    if (/google\.com/i.test(host) && !/gemini\.google\.com/i.test(host)) return "googleai";
    if (/reddit\.com/i.test(host)) return "reddit";
    return host;
  } catch {
    return url;
  }
};

providerToggles.forEach(toggle => {
  toggle.addEventListener('click', async () => {
    const provider = toggle.dataset.provider;
    if (!provider) return;

    try {
      const urls = ((await ipcRenderer.invoke("get-current-urls")) ?? []) as string[];
      const activeProviders = urls.map(url => inferProviderFromUrl(url));
      const isActive = activeProviders.includes(provider);

      if (isActive) {
        // Close provider
        ipcRenderer.send(`close-${provider}`, `close ${provider} now`);
      } else {
        // Open provider
        ipcRenderer.send(`open-${provider}`, `open ${provider} now`);
      }

      // Update toggles after a short delay to allow IPC to process
      setTimeout(updateProviderToggles, 100);
    } catch (error) {
      console.error(`Failed to toggle ${provider}`, error);
    }
  });
});

// Initial update
updateProviderToggles();

// Re-sync the toggle bar whenever workspace changes are applied
ipcRenderer.on("workspace:views-changed", () => {
  // Small delay so the main-process view list has settled
  setTimeout(updateProviderToggles, 150);
});

// Also refresh when settings are saved (covers opening settings on another window, etc.)
ipcRenderer.on("settings:updated", () => {
  setTimeout(updateProviderToggles, 150);
});

const sendButton = document.getElementById("send-prompt-btn") as HTMLButtonElement | null;

const sendPrompt = (): void => {
  if (!textArea) return;
  const value = textArea.value.trim();
  if (!value) return;
  ipcRenderer.send("send-prompt", value);
  textArea.value = "";
  // Reset opacity hint
  sendButton?.classList.remove("has-content");
};

if (textArea) {
  textArea.addEventListener("input", (event: Event) => {
    logToWebPage((event.target as HTMLTextAreaElement).value);
    // Toggle send button brightness based on content
    const hasText = (event.target as HTMLTextAreaElement).value.trim().length > 0;
    sendButton?.classList.toggle("has-content", hasText);
  });

  textArea.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      sendPrompt();
    }
  });
}

if (sendButton) {
  sendButton.addEventListener("click", () => {
    sendPrompt();
    textArea?.focus();
  });
}



// Toast notification helper
const showToast = (message: string, type: "success" | "error" | "info" = "info", durationMs = 2000): void => {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, durationMs);
};

// Copy All Answers button handler
const copyAllAnswersButton = document.getElementById(
  "copy-all-answers",
) as HTMLButtonElement | null;

const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

if (copyAllAnswersButton) {
  copyAllAnswersButton.addEventListener("click", async () => {
    copyAllAnswersButton.disabled = true;

    try {
      const result = await ipcRenderer.invoke("copy-all-answers");

      if (result.success) {
        copyAllAnswersButton.innerHTML = CHECK_ICON_SVG;
        copyAllAnswersButton.classList.add("copied");
        showToast(`Copied ${result.count} answer(s)!`, "success");
      } else {
        showToast(result.message || "No answers found", "error");
      }
    } catch (error) {
      console.error("Failed to copy all answers", error);
      showToast("Copy failed", "error");
    }

    setTimeout(() => {
      copyAllAnswersButton.innerHTML = COPY_ICON_SVG;
      copyAllAnswersButton.classList.remove("copied");
      copyAllAnswersButton.disabled = false;
    }, 1500);
  });
}

ipcRenderer.on("inject-prompt", (event, selectedPrompt: string) => {
  console.log("Injecting prompt into textarea:", selectedPrompt);

  const promptInput = document.getElementById(
    "prompt-input",
  ) as HTMLTextAreaElement;
  if (promptInput) {
    promptInput.value = selectedPrompt; // Inject the selected prompt into the textarea
  } else {
    console.error("Textarea not found");
  }
});

// Initialize sessions sidebar after DOM is ready
// Initialize embedded sessions sidebar (left, visible by default)
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    try { initSessionSidebar(); } catch (err) { console.error(err); }
    try { initSettings(); } catch (err) { console.error(err); }
  }, { once: true });
} else {
  try { initSessionSidebar(); } catch (err) { console.error(err); }
  try { initSettings(); } catch (err) { console.error(err); }
}

// ----- View Headers Implementation -----

let currentLayoutMode: string = 'row';
let stackTabBar: HTMLElement | null = null;
let lastStackActiveIndex = 0;

function inferProviderNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (/chatgpt\.com|chat\.openai\.com/i.test(host)) return "ChatGPT";
    if (/gemini\.google\.com/i.test(host)) return "Gemini";
    if (/perplexity\.ai/i.test(host)) return "Perplexity";
    if (/claude\.ai/i.test(host)) return "Claude";
    if (/grok\.com/i.test(host)) return "Grok";
    if (/deepseek\.com/i.test(host)) return "DeepSeek";
    if (/google\.com/i.test(host) && !/gemini\.google\.com/i.test(host)) return "Google AI";
    if (/reddit\.com/i.test(host)) return "Reddit";
    return host;
  } catch {
    return url.slice(0, 20);
  }
}

function buildStackTabs(layouts: ViewLayout[], activeIndex: number) {
  if (!stackTabBar) {
    stackTabBar = document.getElementById('stack-tab-bar');
    if (!stackTabBar) return;
  }

  // Track the active index so we can reuse it across rebuilds
  if (activeIndex >= 0) {
    lastStackActiveIndex = activeIndex;
  }
  const resolvedActive = activeIndex >= 0 ? activeIndex : lastStackActiveIndex;

  // Position tab bar using sidebar offset from first header bounds
  if (layouts.length > 0) {
    const leftOffset = layouts[0].headerBounds.x;
    stackTabBar.style.left = `${leftOffset}px`;
  }

  // Build a signature of the current tabs to detect if a full rebuild is needed
  const newSig = layouts.map(l => inferProviderNameFromUrl(l.url || l.id)).join('|');
  const oldSig = stackTabBar.dataset.sig || '';

  if (newSig === oldSig) {
    // Same providers — just update the active highlight, no DOM rebuild
    updateStackActiveTab(resolvedActive);
    return;
  }

  // Full rebuild needed (providers changed)
  stackTabBar.dataset.sig = newSig;
  stackTabBar.innerHTML = '';

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'stack-tab-nav';
  prevBtn.title = 'Previous (Ctrl+Shift+Tab)';
  prevBtn.innerHTML = '&#8249;'; // ‹
  prevBtn.addEventListener('click', () => ipcRenderer.send('stack:prev'));
  stackTabBar.appendChild(prevBtn);

  // Tab buttons
  layouts.forEach((layout, index) => {
    const tab = document.createElement('button');
    tab.className = 'stack-tab' + (index === resolvedActive ? ' active' : '');
    tab.dataset.index = String(index);

    const dot = document.createElement('span');
    dot.className = 'stack-tab-dot';

    const label = document.createElement('span');
    label.textContent = inferProviderNameFromUrl(layout.url || layout.id);

    tab.appendChild(dot);
    tab.appendChild(label);

    tab.addEventListener('click', () => {
      ipcRenderer.send('stack:go-to', index);
    });

    stackTabBar!.appendChild(tab);
  });

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'stack-tab-nav';
  nextBtn.title = 'Next (Ctrl+Tab)';
  nextBtn.innerHTML = '&#8250;'; // ›
  nextBtn.addEventListener('click', () => ipcRenderer.send('stack:next'));
  stackTabBar.appendChild(nextBtn);
}

function updateStackActiveTab(activeIndex: number) {
  if (!stackTabBar) return;
  stackTabBar.querySelectorAll<HTMLButtonElement>('.stack-tab').forEach((tab) => {
    const idx = parseInt(tab.dataset.index ?? '-1', 10);
    tab.classList.toggle('active', idx === activeIndex);
  });
}

function setStackMode(enabled: boolean) {
  if (!stackTabBar) {
    stackTabBar = document.getElementById('stack-tab-bar');
  }
  if (stackTabBar) {
    stackTabBar.classList.toggle('visible', enabled);
  }
  // When in stack mode, hide the normal view headers
  if (viewHeadersContainer) {
    viewHeadersContainer.style.display = enabled ? 'none' : '';
  }
}

function updateViewHeaders(layouts: ViewLayout[]) {
  if (!viewHeadersContainer) {
    viewHeadersContainer = document.getElementById('view-headers-container');
    if (!viewHeadersContainer) return;
  }

  currentViewLayouts = layouts;

  // In stack mode, we don't render normal headers — the tab bar replaces them
  if (currentLayoutMode === 'stack') {
    viewHeadersContainer.innerHTML = '';
    return;
  }

  // Clear existing (simple approach; optimization possible if thrashing)
  viewHeadersContainer.innerHTML = '';

  layouts.forEach(layout => {
    const header = document.createElement('div');
    header.className = 'view-header';
    header.style.left = `${layout.headerBounds.x}px`;
    header.style.top = `${layout.headerBounds.y}px`;
    header.style.width = `${layout.headerBounds.width}px`;
    header.style.height = `${layout.headerBounds.height}px`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = layout.url || '';
    input.placeholder = 'Enter URL...';

    // Prevent keydown from bubbling to global handlers (like Ctrl+Enter sender)
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const url = input.value.trim();
        if (url) {
          ipcRenderer.send('view-navigate', { id: layout.id, url });
        }
      }
    });

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.title = 'Copy URL to clipboard';
    copyBtn.addEventListener('click', () => {
      if (layout.url) {
        ipcRenderer.send('copy-to-clipboard', layout.url);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }
    });

    header.appendChild(input);
    header.appendChild(copyBtn);
    viewHeadersContainer?.appendChild(header);
  });
}

// Listen for layout updates from main process
ipcRenderer.on('view-layout-updated', (_event, layouts: ViewLayout[]) => {
  updateViewHeaders(layouts);

  // Rebuild stack tabs whenever views change (if in stack mode)
  if (currentLayoutMode === 'stack') {
    // Pass -1; buildStackTabs will reuse lastStackActiveIndex internally
    buildStackTabs(layouts, -1);
  }
});

// Listen for layout mode changes
ipcRenderer.on('layout:mode-changed', (_event, mode: string) => {
  currentLayoutMode = mode;
  setStackMode(mode === 'stack');
});

// Listen for stack active tab changes
ipcRenderer.on('stack:active-changed', (_event, activeIndex: number) => {
  lastStackActiveIndex = activeIndex;
  updateStackActiveTab(activeIndex);
});

// Ctrl+Tab / Ctrl+Shift+Tab for stack cycling
window.addEventListener('keydown', (e) => {
  if (currentLayoutMode !== 'stack') return;
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      ipcRenderer.send('stack:prev');
    } else {
      ipcRenderer.send('stack:next');
    }
  }
});

// Ensure container reference on load
window.addEventListener('DOMContentLoaded', () => {
  viewHeadersContainer = document.getElementById('view-headers-container');
  stackTabBar = document.getElementById('stack-tab-bar');
});
