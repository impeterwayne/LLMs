/**
 * SynthesisExtractor — Extracts rich Markdown from provider BrowserViews
 * using Turndown (HTML → Markdown) to preserve citations, images, and links.
 *
 * This is used by the synthesis flow (Ctrl+S) instead of the simpler
 * copy-button approach, so Gemini CLI gets content with full source URLs.
 */
import { readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { WebContents } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Turndown source (cached) ────────────────────────────────────
let _turndownSource: string | null = null;

function getTurndownSource(): string {
  if (!_turndownSource) {
    const turndownPath = join(
      __dirname, '..', 'node_modules', 'turndown', 'lib', 'turndown.browser.umd.js'
    );
    const raw = readFileSync(turndownPath, 'utf-8');
    // Wrap the UMD source to force the browser/global codepath.
    // In some Electron contexts module/exports may be defined, causing
    // the UMD to export via CommonJS instead of setting window.TurndownService.
    _turndownSource =
      `(function() {\n` +
      `  var module = undefined, exports = undefined, define = undefined;\n` +
      `  var global = window;\n` +
      `  ${raw}\n` +
      `})();\n`;
  }
  return _turndownSource;
}

/**
 * Container selector config for each provider.
 * These target the response/answer containers in each LLM's DOM.
 */
export interface SynthesisProviderConfig {
  /** Provider display name */
  name: string;
  /** CSS selectors for assistant response containers (tried in order) */
  responseSelectors: string[];
  /** CSS selectors for user message containers (tried in order) */
  userSelectors: string[];
  /** CSS selectors for citation/source containers (Perplexity, etc.) */
  citationSelectors?: string[];
  /** Whether to extract only the last response (vs full conversation) */
  lastResponseOnly?: boolean;
}

/** Provider configs keyed by provider ID */
export const SYNTHESIS_CONFIGS: Record<string, SynthesisProviderConfig> = {
  chatgpt: {
    name: 'ChatGPT',
    responseSelectors: [
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"] [class*="markdown"]',
      '[data-message-author-role="assistant"]',
    ],
    userSelectors: [
      '[data-message-author-role="user"]',
    ],
    lastResponseOnly: true,
  },
  gemini: {
    name: 'Gemini',
    responseSelectors: [
      'model-response .response-content',
      'model-response .model-response-text',
      'model-response .markdown',
      'model-response message-content',
      'message-content .model-response-text',
      'message-content .markdown-main-panel',
      'message-content',
      'model-response',
      // Broader fallbacks
      '.response-container .markdown',
      '.conversation-container .model-response-text',
    ],
    userSelectors: [
      'user-query',
    ],
    lastResponseOnly: true,
  },
  claude: {
    name: 'Claude',
    responseSelectors: [
      // Current selectors (may have changed)
      '[data-testid*="chat-message-"] .font-claude-message',
      '.font-claude-message',
      '[data-testid*="chat-message-"]:not([data-testid*="user"])',
      // Broader fallbacks for Claude's Tailwind-based DOM
      '[class*="prose"]',
      'div.group.backface-hidden',
      '.group [class*="grid"] [class*="flex-col"]',
      // Very broad: any div with 'group' class that has meaningful text
      'div.group',
    ],
    userSelectors: [
      '[data-testid*="chat-message-user"]',
      '.font-user-message',
    ],
    lastResponseOnly: true,
  },
  perplexity: {
    name: 'Perplexity',
    responseSelectors: [
      '.prose',
      '[class*="answer-content"]',
    ],
    userSelectors: [],
    citationSelectors: [
      '.citation-link',
      'a[href][data-testid*="citation"]',
      '.source-link',
      // Perplexity's source cards
      'a[href]:not([href="#"]):not([href=""])',
    ],
    lastResponseOnly: true,
  },
  deepseek: {
    name: 'DeepSeek',
    responseSelectors: [
      '.ds-markdown',
      '.ds-message .ds-markdown',
    ],
    userSelectors: [],
    lastResponseOnly: true,
  },
  grok: {
    name: 'Grok',
    responseSelectors: [
      '.response-content-markdown',
      '.message-text',
    ],
    userSelectors: [],
    lastResponseOnly: true,
  },
  googleai: {
    name: 'Google AI',
    responseSelectors: [
      // Google AI Mode / AI Overview response containers
      '[data-attrid="wa:/tldr"] .mod',
      '.aimod .mod',
      '.wDYxhc[data-md]',
      '.wDYxhc',
      '.ai-overview-card',
      '[jsname="N760b"]',
      '.kp-blk',
    ],
    userSelectors: [],
    citationSelectors: [
      '.aimod a[href]',
      '[data-attrid="wa:/tldr"] a[href]',
      '.wDYxhc a[href]',
    ],
    lastResponseOnly: true,
  },
  reddit: {
    name: 'Reddit Answers',
    responseSelectors: [
      // Reddit Answers / search result containers
      '.answer-content',
      '[data-testid="answer-content"]',
      '.Post .RichTextJSON-root',
      '.RichTextJSON-root',
      'guides-answer-card',
      '.guides-answer-text',
      'article',
      '.Comment .md',
    ],
    userSelectors: [],
    citationSelectors: [
      '.answer-content a[href]',
      'article a[href]',
    ],
    lastResponseOnly: true,
  },
};

/**
 * Build a JavaScript script that:
 * 1. Injects Turndown.js into the page (if not already present)
 * 2. Finds response containers using provider-specific selectors
 * 3. Converts innerHTML → Markdown (preserving links + images)
 * 4. Returns the result as a string
 */
export function buildSynthesisExtractionScript(providerId: string): string {
  const config = SYNTHESIS_CONFIGS[providerId];
  if (!config) {
    // Fallback: return empty
    return `(async () => { return null; })()`;
  }

  const turndownSrc = getTurndownSource();

  // Build the extraction script that runs in page context
  const script = `
(async () => {
  try {
    // ── 1. Inject Turndown if needed ──
    if (typeof window.__LLM_GOD_TurndownService === 'undefined') {
      ${turndownSrc}
      if (typeof TurndownService !== 'undefined') {
        window.__LLM_GOD_TurndownService = TurndownService;
      } else if (typeof window.TurndownService !== 'undefined') {
        window.__LLM_GOD_TurndownService = window.TurndownService;
      } else {
        console.error('[LLM-God Synthesis] TurndownService not defined after injection');
        return null;
      }
    }

    // ── 2. Create Turndown instance with good defaults ──
    const td = new window.__LLM_GOD_TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Keep images (Turndown handles them by default as ![alt](src))
    // Keep links (Turndown handles them by default as [text](href))

    // Custom rule: preserve citation superscript links
    td.addRule('citationLinks', {
      filter: function(node) {
        return node.nodeName === 'A' && node.getAttribute('href') &&
               (node.classList.contains('citation') ||
                node.closest('.citation') ||
                /^\\[?\\d+\\]?$/.test(node.textContent.trim()));
      },
      replacement: function(content, node) {
        var href = node.getAttribute('href') || '';
        var text = content.trim();
        if (!text) text = node.textContent.trim();
        return '[' + text + '](' + href + ')';
      }
    });

    // Custom rule: skip hidden elements, buttons, nav elements
    td.addRule('skipUI', {
      filter: function(node) {
        if (!node || !node.tagName) return false;
        var tag = node.tagName.toLowerCase();
        if (['button', 'nav', 'footer', 'header', 'svg', 'path'].includes(tag)) return true;
        if (node.getAttribute('role') === 'button') return true;
        if (node.getAttribute('aria-hidden') === 'true') return true;
        var style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        return false;
      },
      replacement: function() { return ''; }
    });

    // ── 3. Find response containers ──
    var responseSelectors = ${JSON.stringify(config.responseSelectors)};
    var lastOnly = ${config.lastResponseOnly ? 'true' : 'false'};
    var responses = [];

    console.log('[LLM-God Synthesis] Looking for responses with selectors:', responseSelectors);
    for (var sel of responseSelectors) {
      var els = document.querySelectorAll(sel);
      console.log('[LLM-God Synthesis] Selector', sel, '→', els.length, 'matches');
      if (els.length > 0) {
        responses = Array.from(els);
        break;
      }
    }

    if (responses.length === 0) {
      // Return diagnostic info about page structure (for debugging)
      var diag = [];
      var allEls = document.querySelectorAll('div, article, section, main');
      var seen = new Set();
      for (var d = 0; d < Math.min(allEls.length, 300); d++) {
        var el = allEls[d];
        var tag = el.tagName.toLowerCase();
        var cls = el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
        var tid = el.getAttribute('data-testid') || '';
        var role = el.getAttribute('role') || '';
        var key = tag + '.' + cls + '#' + tid;
        if (!seen.has(key) && (cls || tid || role)) {
          seen.add(key);
          diag.push(tag + (cls ? '.' + cls : '') + (tid ? '[data-testid=' + tid + ']' : '') + (role ? '[role=' + role + ']' : ''));
        }
      }
      return { __diag: true, selectors: responseSelectors, elements: diag.slice(0, 50) };
    }

    // If lastOnly, take only the last response
    if (lastOnly) {
      responses = [responses[responses.length - 1]];
    }

    // ── 4. Convert each response to Markdown ──
    var parts = [];
    for (var i = 0; i < responses.length; i++) {
      var el = responses[i];
      // Clone the element to avoid modifying the page
      var clone = el.cloneNode(true);

      // Remove buttons, action bars, copy buttons from clone
      clone.querySelectorAll('button, [role="button"], .action-buttons, [class*="action"]').forEach(function(n) { n.remove(); });

      var md = td.turndown(clone.innerHTML);
      if (md && md.trim().length > 0) {
        parts.push(md.trim());
      }
    }

    if (parts.length === 0) return null;

    // ── 5. Extract citation sources (for Perplexity etc.) ──
    var citationSelectors = ${JSON.stringify(config.citationSelectors || [])};
    var citations = [];
    if (citationSelectors.length > 0) {
      // Gather unique source URLs from citation links
      var seen = new Set();
      for (var cSel of citationSelectors) {
        var cEls = document.querySelectorAll(cSel);
        for (var cEl of cEls) {
          var href = cEl.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !seen.has(href)) {
            seen.add(href);
            var title = cEl.textContent?.trim() || cEl.getAttribute('title') || '';
            if (title.length > 200) title = title.substring(0, 200);
            citations.push({ url: href, title: title });
          }
        }
      }
    }

    // ── 6. Assemble final output ──
    var output = parts.join('\\n\\n---\\n\\n');

    if (citations.length > 0) {
      output += '\\n\\n## Sources\\n';
      for (var j = 0; j < citations.length; j++) {
        var c = citations[j];
        output += '- [' + (c.title || 'Source ' + (j + 1)) + '](' + c.url + ')\\n';
      }
    }

    return output;
  } catch (err) {
    console.error('[LLM-God Synthesis]', err);
    return null;
  }
})()
`;

  return script;
}

/**
 * Extract synthesis content from a BrowserView's webContents.
 * Returns rich Markdown with preserved links and images, or null if extraction fails.
 */
export async function extractSynthesisContent(
  webContents: WebContents,
  providerId: string
): Promise<string | null> {
  try {
    const script = buildSynthesisExtractionScript(providerId);
    const result = await webContents.executeJavaScript(script);

    // Check for diagnostic info (returned when selectors don't match)
    if (result && typeof result === 'object' && result.__diag) {
      const diagMsg = `\n=== ${providerId} ===\nTried: ${JSON.stringify(result.selectors)}\nPage elements:\n${(result.elements || []).join('\n')}\n`;
      console.warn(`[SynthesisExtractor] ${providerId}: No selectors matched.`);
      // Append diagnostics to a temp file for easy reading
      const diagPath = join(__dirname, '..', 'synth-diag.txt');
      try { appendFileSync(diagPath, diagMsg, 'utf8'); } catch { }
      return null;
    }

    if (typeof result === 'string' && result.trim().length > 0) {
      return result;
    }
    return null;
  } catch (err) {
    console.error(`[SynthesisExtractor] Failed for ${providerId}:`, err);
    return null;
  }
}
