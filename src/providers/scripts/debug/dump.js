// Debug: Dump the current page's DOM structure for offline analysis.
// This captures the input area, send buttons, and overall page structure
// while stripping out noise (scripts, large data attributes, SVG paths).
(() => {
    const MAX_DEPTH = 30;
    const STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK']);
    const KEEP_ATTRS = new Set([
        'id', 'class', 'role', 'aria-label', 'aria-describedby',
        'data-testid', 'data-placeholder', 'placeholder',
        'contenteditable', 'type', 'name', 'action', 'method',
        'href', 'src', 'title', 'tabindex', 'disabled',
    ]);

    function serialize(node, depth = 0) {
        if (depth > MAX_DEPTH) return '<!-- max depth -->';
        if (!node) return '';

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            return text.length > 0 && text.length < 200 ? text : '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName;
        if (STRIP_TAGS.has(tag)) return '';

        const indent = '  '.repeat(depth);
        let attrs = '';
        for (const attr of node.attributes || []) {
            if (KEEP_ATTRS.has(attr.name) || attr.name.startsWith('aria-') || attr.name.startsWith('data-')) {
                let val = attr.value;
                // Truncate very long attribute values
                if (val.length > 150) val = val.substring(0, 150) + '…';
                attrs += ` ${attr.name}="${val}"`;
            }
        }

        const selfClosing = ['IMG', 'INPUT', 'BR', 'HR', 'META'].includes(tag);
        if (selfClosing) return `${indent}<${tag.toLowerCase()}${attrs} />`;

        // For large containers, only show interactive/semantic children
        let children = '';
        const childNodes = node.childNodes;
        if (childNodes.length > 500) {
            // Too many children — summarize
            children = `\n${indent}  <!-- ${childNodes.length} children, truncated -->`;
        } else {
            for (const child of childNodes) {
                const s = serialize(child, depth + 1);
                if (s) children += '\n' + s;
            }
        }

        // Also traverse shadow roots
        if (node.shadowRoot) {
            children += `\n${indent}  <!-- #shadow-root -->`;
            for (const child of node.shadowRoot.childNodes) {
                const s = serialize(child, depth + 1);
                if (s) children += '\n' + s;
            }
        }

        if (!children && !attrs) return ''; // Skip empty noise elements

        return `${indent}<${tag.toLowerCase()}${attrs}>${children}\n${indent}</${tag.toLowerCase()}>`;
    }

    // Collect targeted info for script debugging
    const info = {
        url: location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
    };

    // Find key interactive elements
    const interactiveSelectors = [
        'textarea',
        '[contenteditable="true"]',
        '[contenteditable=""]',
        'button[type="submit"]',
        'button[data-testid*="send"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="send"]',
        'button[aria-label*="Gửi"]',
        'form',
        '[role="textbox"]',
        '[data-testid]',
    ];

    const interactiveElements = [];
    for (const sel of interactiveSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
            const rect = el.getBoundingClientRect();
            interactiveElements.push({
                selector: sel,
                tag: el.tagName.toLowerCase(),
                id: el.id || null,
                classes: el.className?.toString?.()?.substring(0, 200) || null,
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label'),
                dataTestId: el.getAttribute('data-testid'),
                contentEditable: el.contentEditable,
                placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder'),
                visible: rect.width > 0 && rect.height > 0,
                bounds: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            });
        }
    }

    const dom = serialize(document.body);

    return JSON.stringify({
        info,
        interactiveElements,
        dom,
    }, null, 2);
})();
