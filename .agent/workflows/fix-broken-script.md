---
description: How to fix a broken provider script when a website changes its UI
---

# Fix Broken Provider Script

When a provider website (ChatGPT, Gemini, Grok, etc.) changes their UI and the inject/send/copy scripts break, follow this workflow:

## 1. Capture the Debug Dump

1. **Click on** the broken provider pane in the LLM-God app to focus it.
2. Press **Ctrl+Shift+D** — this dumps only the focused view.
   - If no view is focused, it falls back to dumping all views.
- `dump.json` — Full DOM structure + interactive elements + page info
- `dom.html` — Cleaned HTML of the page body (readable)
- `interactive.json` — All buttons, textareas, forms, contenteditable elements with their selectors
- `screenshot.png` — Visual screenshot of the page

## 2. Tell the Agent

Say something like:
> "The ChatGPT inject script is broken. I pressed Ctrl+Shift+D, check the debug dump."

## 3. Agent Diagnosis

// turbo-all
The agent will:

1. Find the latest dump directory:
```
ls debug-dumps/ -Sort LastWriteTime | Select -Last 1
```

2. Read the dump files to understand the current DOM:
```
- Read `debug-dumps/<latest>/<provider>/interactive.json` for button/textarea selectors
- Read `debug-dumps/<latest>/<provider>/dom.html` for overall structure
- View `debug-dumps/<latest>/<provider>/screenshot.png` for visual context
```

3. Compare with the existing script:
```
- Read `src/providers/scripts/<provider>/inject.js` (or send.js, copy.js)
- Identify mismatched selectors
```

4. Fix the script file with updated selectors

5. Rebuild and test:
```
npm run build
```

## Files Involved

- **Debug dump script**: `src/providers/scripts/debug/dump.js`
- **Dump function**: `dumpViewDebugInfo()` in `src/utilities.ts`
- **Shortcut**: `Ctrl+Shift+D` registered in `src/main.ts`
- **Provider scripts**: `src/providers/scripts/<provider>/*.js`
- **Provider definitions**: `src/providers/<provider>.ts`
