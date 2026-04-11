export function toCamel(s: string): string {
    return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function parseVal(v: string | null): unknown {
    if (v === '' || v == null) return true;
    if (v === 'true') return true;
    if (v === 'false') return false;
    const trimmed = v.trim();
    if (trimmed !== '' && !Number.isNaN(Number(v))) return Number(v);

    try {
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            return JSON.parse(trimmed);
        }
    } catch { }

    return v;
}

export function readOptions(
    el: HTMLElement,
    name: string,
    prefix: string = 'ui' // Default prefix
): Record<string, unknown> {
    const opts: Record<string, unknown> = {};
    const optionPrefix = `${prefix}-${name}-`;

    const json = el.getAttribute(`${prefix}-${name}`);
    if (json) {
        try {
            Object.assign(opts, JSON.parse(json) as object);
        } catch { }
    }

    for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith(optionPrefix)) {
            const key = toCamel(attr.name.slice(optionPrefix.length));
            opts[key] = parseVal(attr.value);
        }
    }

    return opts;
}

export function getDataTarget(
    trigger: HTMLElement,
    prefix: string
): HTMLElement | null {
    const selector =
        trigger.getAttribute('data-target') ||
        trigger.getAttribute(`data-${prefix}-target`) ||
        getHashSelector(trigger);

    if (!selector) {
        return null;
    }

    try {
        return document.querySelector<HTMLElement>(selector);
    } catch {
        return null;
    }
}

export function getDataAction(trigger: HTMLElement, prefix: string): string {
    return trigger.getAttribute(`data-${prefix}-action`) || 'toggle';
}

export function invokeAction(
    instance: Record<string, unknown>,
    action: string,
    ...args: unknown[]
): unknown {
    const direct = instance[action];
    if (typeof direct === 'function') {
        return direct.apply(instance, args);
    }

    if (action === 'toggle') {
        const fallback = instance.show || instance.open;
        if (typeof fallback === 'function') {
            return fallback.apply(instance, args);
        }
    }

    return undefined;
}

function getHashSelector(trigger: HTMLElement): string | null {
    const href = trigger.getAttribute('href');
    return href && href.startsWith('#') ? href : null;
}

// TODO: Start Version 1.2.0
// NEW: @directives (@click, @change, etc.)
export function collectDirectives(
    el: HTMLElement,
    _prefix: string
): Record<string, string> {
    const directives: Record<string, string> = {};

    for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('@')) {
            directives[attr.name] = attr.value;
        }
    }

    return directives;
}

// NEW: collectRefs (ref="myButton")
export function collectRefs(root: HTMLElement): Record<string, HTMLElement> {
    const refs: Record<string, HTMLElement> = {};

    if (root.hasAttribute('ref')) {
        const rootRefName = root.getAttribute('ref');
        if (rootRefName) {
            refs[rootRefName] = root;
        }
    }

    for (const el of root.querySelectorAll<HTMLElement>('[ref]')) {
        const refName = el.getAttribute('ref');
        if (refName) {
            refs[refName] = el;
        }
    }

    return refs;
}
// TODO: End
