const ipcRenderer = window.electron.ipcRenderer;

// ── Types ──
type LayoutMode = 'row' | 'grid-auto' | 'grid-2col' | 'grid-2row' | 'stack';

interface WorkspaceSettings {
    workspaceName: string;
    defaultProviders: string[];
    layout: LayoutMode;
    showAddressBar: boolean;
    showProviderBar: boolean;
}

const ALL_PROVIDERS = [
    "chatgpt", "gemini", "perplexity", "claude",
    "grok", "deepseek", "googleai", "reddit",
];

const PRESETS: Record<string, string[]> = {
    all: [...ALL_PROVIDERS],
    minimal: ["chatgpt", "gemini", "perplexity"],
    research: ["googleai", "reddit", "perplexity"],
    none: [],
};

const LAYOUT_MODES: LayoutMode[] = ['row', 'grid-auto', 'grid-2col', 'grid-2row', 'stack'];

// ── State ──
let currentSettings: WorkspaceSettings = {
    workspaceName: "",
    defaultProviders: ["chatgpt", "gemini", "perplexity"],
    layout: "stack",
    showAddressBar: false,
    showProviderBar: true,
};

// ── DOM Helpers ──
function getOverlay(): HTMLElement | null {
    return document.getElementById("settings-overlay");
}

function getCheckboxes(): NodeListOf<HTMLInputElement> {
    return document.querySelectorAll<HTMLInputElement>("#workspace-providers input[type='checkbox']");
}

function syncCheckboxVisuals() {
    getCheckboxes().forEach((cb) => {
        const item = cb.closest(".workspace-provider-item");
        if (!item) return;
        item.classList.toggle("checked", cb.checked);
    });
}

function syncLayoutButtons(activeLayout: LayoutMode) {
    document.querySelectorAll<HTMLButtonElement>(".layout-mode-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.layout === activeLayout);
    });
}

function getSelectedLayout(): LayoutMode {
    const active = document.querySelector<HTMLButtonElement>(".layout-mode-btn.active");
    return (active?.dataset.layout as LayoutMode) || currentSettings.layout || "stack";
}

function syncToggleSwitches() {
    const addrToggle = document.getElementById("toggle-address-bar") as HTMLInputElement | null;
    const provToggle = document.getElementById("toggle-provider-bar") as HTMLInputElement | null;
    if (addrToggle) addrToggle.checked = currentSettings.showAddressBar !== false;
    if (provToggle) provToggle.checked = currentSettings.showProviderBar !== false;
}

function applyVisibility() {
    const headersContainer = document.getElementById("view-headers-container");
    const chatHeader = document.querySelector(".chat-header") as HTMLElement | null;
    if (headersContainer) {
        headersContainer.style.display = currentSettings.showAddressBar === false ? "none" : "";
    }
    if (chatHeader) {
        chatHeader.style.display = currentSettings.showProviderBar === false ? "none" : "";
    }
}

function setCheckedProviders(providers: string[]) {
    getCheckboxes().forEach((cb) => {
        cb.checked = providers.includes(cb.dataset.provider ?? "");
    });
    syncCheckboxVisuals();
}

function getCheckedProviders(): string[] {
    const result: string[] = [];
    getCheckboxes().forEach((cb) => {
        if (cb.checked && cb.dataset.provider) {
            result.push(cb.dataset.provider);
        }
    });
    return result;
}

// ── Load / Save ──
async function loadSettings(): Promise<WorkspaceSettings> {
    try {
        const settings = await ipcRenderer.invoke("settings:get") as WorkspaceSettings | null;
        if (settings) {
            currentSettings = settings;
        }
    } catch (err) {
        console.error("Failed to load settings", err);
    }
    return currentSettings;
}

async function saveSettings(settings: WorkspaceSettings): Promise<void> {
    try {
        await ipcRenderer.invoke("settings:save", settings);
        currentSettings = settings;
    } catch (err) {
        console.error("Failed to save settings", err);
    }
}

// ── Overlay Control ──
function openSettings() {
    const overlay = getOverlay();
    if (!overlay) return;

    // Populate form with current settings
    const nameInput = document.getElementById("workspace-name") as HTMLInputElement | null;
    if (nameInput) nameInput.value = currentSettings.workspaceName || "";
    setCheckedProviders(currentSettings.defaultProviders);
    syncLayoutButtons(currentSettings.layout || "stack");
    syncToggleSwitches();

    // Hide browser views so they don't paint over the modal
    ipcRenderer.send("toggle-views-visibility", false);

    overlay.classList.add("visible");
}

function closeSettings() {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.classList.remove("visible");

    // Restore browser views
    ipcRenderer.send("toggle-views-visibility", true);
}

function flashSaved() {
    const el = document.getElementById("settings-saved");
    if (!el) return;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2000);
}

// ── Init ──
export async function initSettings() {
    await loadSettings();

    // Settings buttons
    const settingsBtn = document.getElementById("settings-btn");
    const closeBtn = document.getElementById("settings-close");
    const cancelBtn = document.getElementById("settings-cancel");
    const saveBtn = document.getElementById("settings-save");
    const overlay = getOverlay();

    const openHandler = () => {
        openSettings();
    };
    settingsBtn?.addEventListener("click", openHandler);


    closeBtn?.addEventListener("click", closeSettings);
    cancelBtn?.addEventListener("click", closeSettings);

    // Click on backdrop to close
    overlay?.addEventListener("click", (e) => {
        if (e.target === overlay) closeSettings();
    });

    // Escape key to close
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay?.classList.contains("visible")) {
            closeSettings();
        }
    });

    // Checkbox visual sync
    getCheckboxes().forEach((cb) => {
        cb.addEventListener("change", syncCheckboxVisuals);
    });

    // Preset buttons
    document.querySelectorAll<HTMLButtonElement>(".workspace-preset-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const preset = btn.dataset.preset;
            if (!preset || !PRESETS[preset]) return;
            setCheckedProviders(PRESETS[preset]);

            // Update active preset button
            document.querySelectorAll<HTMLButtonElement>(".workspace-preset-btn").forEach((b) => {
                b.classList.toggle("active", b === btn);
            });
        });
    });

    // Layout mode buttons
    document.querySelectorAll<HTMLButtonElement>(".layout-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.layout as LayoutMode;
            if (!mode || !LAYOUT_MODES.includes(mode)) return;
            syncLayoutButtons(mode);
        });
    });

    // Save
    saveBtn?.addEventListener("click", async () => {
        const nameInput = document.getElementById("workspace-name") as HTMLInputElement | null;
        const next: WorkspaceSettings = {
            workspaceName: nameInput?.value.trim() || "",
            defaultProviders: getCheckedProviders(),
            layout: getSelectedLayout(),
            showAddressBar: (document.getElementById("toggle-address-bar") as HTMLInputElement)?.checked ?? true,
            showProviderBar: (document.getElementById("toggle-provider-bar") as HTMLInputElement)?.checked ?? true,
        };
        await saveSettings(next);


        // Apply workspace immediately
        ipcRenderer.send("settings:apply-workspace", next);

        flashSaved();

        // Close after a short delay
        setTimeout(closeSettings, 800);
    });

    // Listen for settings changes from main process
    ipcRenderer.on("settings:updated", (_event: any, settings: WorkspaceSettings) => {
        currentSettings = settings;
    });

    // Listen for visibility toggles from main process
    ipcRenderer.on("ui:toggle-address-bar", (_event: any, visible: boolean) => {
        currentSettings.showAddressBar = visible;
        applyVisibility();
    });

    ipcRenderer.on("ui:toggle-provider-bar", (_event: any, visible: boolean) => {
        currentSettings.showProviderBar = visible;
        applyVisibility();
    });

    // Apply initial visibility
    applyVisibility();
}

