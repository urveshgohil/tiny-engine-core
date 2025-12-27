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
    } catch {

    }

    return v;
}

export function readOptions(el: HTMLElement, name: string): Record<string, unknown> {
    const opts: Record<string, unknown> = {};

    const json = el.getAttribute(`ui-${name}`);
    if (json) {
        try {
            Object.assign(opts, JSON.parse(json) as object);
        } catch {
            // ignore
        }
    }

    for (const attr of Array.from(el.attributes)) {
        const pfx = `ui-${name}-`;
        if (attr.name.startsWith(pfx)) {
            const key = toCamel(attr.name.slice(pfx.length));
            opts[key] = parseVal(attr.value);
        }
    }

    return opts;
}