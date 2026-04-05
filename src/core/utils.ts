export function toCamel(s: string): string {
    return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function parseVal(v: string | null): unknown {
    if (v === '' || v == null) return true;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);

    try {
        if (
            typeof v === 'string' &&
            ((v.startsWith('{') && v.endsWith('}')) ||
                (v.startsWith('[') && v.endsWith(']')))
        ) {
            return JSON.parse(v);
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

    const json = el.getAttribute(`${prefix}-${name}`);
    if (json) {
        try {
            Object.assign(opts, JSON.parse(json) as object);
        } catch { }
    }

    for (const attr of Array.from(el.attributes)) {
        const pfx = `${prefix}-${name}-`;
        if (attr.name.startsWith(pfx)) {
            const key = toCamel(attr.name.slice(pfx.length));
            opts[key] = parseVal(attr.value);
        }
    }

    return opts;
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

    root.querySelectorAll('[ref]').forEach((el) => {
        const refName = (el as HTMLElement).getAttribute('ref');
        if (refName) {
            refs[refName] = el as HTMLElement;
        }
    });

    return refs;
}
// TODO: End
