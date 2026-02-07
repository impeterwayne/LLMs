/**
 * Provider Registry — Maps URLs to their corresponding LLM provider.
 *
 * When adding a new LLM provider:
 * 1. Create a new file in src/providers/ (copy the simplest existing one)
 * 2. Import and add it to the PROVIDERS array below
 * That's it!
 */
import type { Provider } from './types.js';

import { chatgpt } from './chatgpt.js';
import { gemini } from './gemini.js';
import { perplexity } from './perplexity.js';
import { claude } from './claude.js';
import { grok } from './grok.js';
import { deepseek } from './deepseek.js';

import { googleai } from './googleai.js';
import { reddit } from './reddit.js';

/**
 * Ordered list of all registered providers.
 *
 * ⚠️ Order matters for overlapping URL patterns!
 * More specific patterns (gemini.google.com) must come
 * before broader ones (google.com).
 */
const PROVIDERS: Provider[] = [
    chatgpt,
    gemini,       // Must be before googleai (gemini.google.com vs google.com)
    perplexity,
    claude,
    grok,
    deepseek,

    googleai,     // Must be after gemini
    reddit,
];

/**
 * Find the provider for a given URL.
 * Returns undefined if no provider matches.
 */
export function getProvider(url: string | undefined): Provider | undefined {
    if (!url) return undefined;
    return PROVIDERS.find(p => p.matchUrl(url));
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): readonly Provider[] {
    return PROVIDERS;
}
