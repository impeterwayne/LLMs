<p align="center">
  <img src="logo.ico" width="96" alt="LLM-Space logo" />
</p>

<h1 align="center">LLM-Space</h1>

<p align="center">
  <strong>Prompt every LLM at once — then synthesize the best answer.</strong><br />
  <em>Built with Electron · TypeScript · Windows · MIT License</em>
</p>

<p align="center">
  <a href="https://github.com/impeterwayne/llm-god/releases"><img src="https://img.shields.io/github/v/release/impeterwayne/llm-god?style=flat-square" alt="Latest release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
</p>

---

![Main Interface](docs/screenshot-main.png?v=103)

## About

**LLM-Space** is a desktop app that lets you type a prompt once and broadcast it to multiple LLMs simultaneously. No more copy-pasting between tabs — compare answers side by side or flip through them in **Stack mode**, then hit one key to **synthesize** every response into a unified, citation-rich answer powered by the Gemini CLI.

### Supported Providers

| Chat LLMs | Research |
|---|---|
| ChatGPT · Gemini · Claude | Google AI Mode |
| Perplexity · Grok · DeepSeek | Reddit Answers |

## Installation

1. Download the latest `Setup.exe` from [**Releases**](https://github.com/impeterwayne/llm-god/releases).
2. Windows may flag the installer — click **"More info" → "Run anyway"** (code-signing pending).
3. The app launches automatically after install.

## Features

### ⚡ Core

| Feature | Description |
|---------|-------------|
| **Simultaneous Prompting** | `Ctrl+Enter` sends your prompt to all active LLMs at once |
| **AI Synthesis** | `Ctrl+S` extracts every provider's answer and feeds them to the **Gemini CLI**, producing a single, synthesized Markdown response in a dedicated window |
| **Global Magic Copy** | `Ctrl+Q` grabs selected text from *any* app, opens a new LLM-Space session, and loads it as your prompt — instant research from anywhere |
| **File Drag & Drop** | Drop files into the prompt area to broadcast them to all providers |

### 🗂️ Session Management

| Feature | Description |
|---------|-------------|
| **Sessions** | Create (`Ctrl+N`), pin, rename, switch, and delete sessions — each remembers its providers and URLs |
| **Session Sidebar** | Scrollable sidebar with session list; toggle with `Ctrl+Shift+S` |
| **Copy All Answers** | One click copies every provider's full conversation to your clipboard |

### 🖥️ Workspace & Layout

| Feature | Description |
|---------|-------------|
| **Stack Mode** *(default)* | View one provider at a time with tab navigation and `Ctrl+Tab` / `Ctrl+Shift+Tab` switching |
| **Multiple Layouts** | Row, Grid, 2-Column, 2-Row layouts available via workspace settings |
| **Provider Toggles** | Quickly enable/disable individual providers; choose from presets (All, Minimal, Research) |
| **Custom Workspaces** | Name your workspace, pick default providers, and select your preferred layout |

### 🎨 Polish

| Feature | Description |
|---------|-------------|
| **Dark Mode** | All providers render in dark theme automatically via custom CSS injection |
| **Right-Click Menu** | Copy images, links, text; navigate back/forward/reload; switch tab in Stack mode |
| **Custom Styling** | Per-provider CSS for a unified, beautiful dark experience |

## Synthesis

The **Synthesis** feature is what sets LLM-Space apart. Press `Ctrl+S` after providers respond, and LLM-Space will:

1. **Extract** rich Markdown from each active provider using [Turndown](https://github.com/mixmark-io/turndown) (preserving links, images, citations)
2. **Pipe** all extracted answers to the **Gemini CLI** with a synthesis prompt
3. **Stream** the unified response in real-time into a dedicated Synthesis window with full Markdown rendering

The result is a single, well-structured answer that synthesizes insights from ChatGPT, Gemini, Claude, Perplexity, and more — with source attribution.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Send prompt to all providers |
| `Ctrl + S` | Synthesize all answers via Gemini CLI |
| `Ctrl + Q` | Global magic copy → new session |
| `Ctrl + N` | New session (fresh layout) |
| `Ctrl + Tab` | Next provider (Stack mode) |
| `Ctrl + Shift + Tab` | Previous provider (Stack mode) |
| `Ctrl + Shift + S` | Toggle session sidebar |
| `Ctrl + Shift + D` | Debug: dump DOM + screenshot (dev) |
| `Ctrl + W` | Quit |

## Tech Stack

- **[Electron](https://www.electronjs.org/)** — Desktop shell with `BrowserWindow` + `WebContentsView`
- **TypeScript** — Full type safety across main, renderer, and provider layers
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — Powers the synthesis engine
- **[Turndown](https://github.com/mixmark-io/turndown)** — HTML → Markdown extraction for synthesis
- **[marked](https://github.com/markedjs/marked)** — Markdown rendering in the synthesis window
- **[electron-store](https://github.com/sindresorhus/electron-store)** — Persistent settings & session storage
- **[electron-localshortcut](https://github.com/nichochar/electron-localshortcut)** — Window-scoped keyboard shortcuts

## Development

```bash
npm install       # Install dependencies
npm run start     # Dev mode (build + launch)
npm test          # Run tests
npm run make      # Package for distribution
```

### Project Structure

```
src/
├── main.ts                  # Electron main process — windows, IPC, shortcuts
├── renderer.ts              # UI logic — prompt bar, tabs, provider toggles
├── settings.ts              # Workspace settings overlay
├── sessionSidebar.ts        # Session list sidebar
├── commandPipeline.ts       # Ctrl+Q magic copy pipeline
├── geminiTerminal.ts        # Gemini CLI process wrapper
├── synthesisExtractor.ts    # Per-provider DOM → Markdown extraction
├── customStyles.ts          # Dark-mode CSS injection per provider
├── utilities.ts             # Shared helpers & debug tools
└── providers/
    ├── chatgpt.ts           # ChatGPT prompt injection & copy
    ├── gemini.ts            # Gemini prompt injection & copy
    ├── claude.ts            # Claude prompt injection & copy
    ├── perplexity.ts        # Perplexity prompt injection & copy
    ├── grok.ts              # Grok prompt injection & copy
    ├── deepseek.ts          # DeepSeek prompt injection & copy
    ├── googleai.ts          # Google AI Mode injection & copy
    ├── reddit.ts            # Reddit Answers injection & copy
    ├── registry.ts          # Provider registry
    ├── shared.ts            # Shared provider utilities
    ├── types.ts             # Provider type definitions
    └── scripts/             # Per-provider injected JS (copy, styling)
```

## License

[MIT](LICENSE) © Nguyen Khac Cuong
