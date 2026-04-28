export interface TinyEngineRuntimeConfig {
    prefix: string;
    debug: boolean;
    warnings: boolean;
}

export interface TinyEngineRegistrySnapshot {
    name: string;
    kind: 'class' | 'function';
    selector: string;
    defaults: Record<string, unknown>;
}

export interface TinyEnginePluginSnapshot {
    name: string;
    version?: string;
    installedAt: number;
}

export interface TinyEngineCapsuleSnapshot {
    uid: string;
    name: string;
    element: HTMLElement;
    options: Record<string, unknown>;
    props: Record<string, unknown>;
    refs: Record<string, HTMLElement>;
    refNames: string[];
}

export interface TinyEngineStoreSnapshot {
    id: string;
    state: unknown;
    listeners: number;
    middlewares: number;
}

export interface TinyEngineWarningSnapshot {
    message: string;
    detail?: unknown;
    timestamp: number;
}

export interface TinyEngineEventSnapshot {
    type: string;
    payload?: unknown;
    timestamp: number;
}

export interface TinyEngineDevtoolsSnapshot {
    version: string;
    config: TinyEngineRuntimeConfig;
    registry: TinyEngineRegistrySnapshot[];
    plugins: TinyEnginePluginSnapshot[];
    instances: TinyEngineCapsuleSnapshot[];
    stores: TinyEngineStoreSnapshot[];
    warnings: TinyEngineWarningSnapshot[];
    events: TinyEngineEventSnapshot[];
}

export interface TinyEngineDevtoolsBridge extends TinyEngineDevtoolsSnapshot {
    inspect(): TinyEngineDevtoolsSnapshot;
    clearEvents(): void;
}

const ENGINE_VERSION = '1.5.0';
const runtimeConfig: TinyEngineRuntimeConfig = {
    prefix: 'ui',
    debug: false,
    warnings: true
};

const registry = new Map<string, TinyEngineRegistrySnapshot>();
const plugins = new Map<string, TinyEnginePluginSnapshot>();
const instances = new Map<string, TinyEngineCapsuleSnapshot>();
const stores = new Map<string, TinyEngineStoreSnapshot>();
const warnings: TinyEngineWarningSnapshot[] = [];
const events: TinyEngineEventSnapshot[] = [];
const warnedMessages = new Set<string>();
const maxEvents = 200;
const maxWarnings = 100;

function cloneValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
        try {
            return globalThis.structuredClone(value);
        } catch {
            return value;
        }
    }

    try {
        return JSON.parse(JSON.stringify(value)) as T;
    } catch {
        return value;
    }
}

function limitBuffer<T>(buffer: T[], size: number): void {
    if (buffer.length > size) {
        buffer.splice(0, buffer.length - size);
    }
}

function ensureDevtoolsBridge(): TinyEngineDevtoolsBridge {
    const host = globalThis as typeof globalThis & {
        __TINY_ENGINE__?: TinyEngineDevtoolsBridge;
    };

    if (!host.__TINY_ENGINE__) {
        host.__TINY_ENGINE__ = {
            version: ENGINE_VERSION,
            config: runtimeConfig,
            registry: [],
            plugins: [],
            instances: [],
            stores: [],
            warnings: [],
            events: [],
            inspect: () => getDevtoolsSnapshot(),
            clearEvents: () => {
                events.length = 0;
                syncBridge();
            }
        };
    }

    return host.__TINY_ENGINE__;
}

function syncBridge(): TinyEngineDevtoolsBridge {
    const bridge = ensureDevtoolsBridge();
    bridge.version = ENGINE_VERSION;
    bridge.config = runtimeConfig;
    bridge.registry = Array.from(registry.values());
    bridge.plugins = Array.from(plugins.values());
    bridge.instances = Array.from(instances.values());
    bridge.stores = Array.from(stores.values());
    bridge.warnings = warnings;
    bridge.events = events;
    return bridge;
}

export function getRuntimeConfig(): TinyEngineRuntimeConfig {
    return runtimeConfig;
}

export function updateRuntimeConfig(next: Partial<TinyEngineRuntimeConfig>): TinyEngineRuntimeConfig {
    Object.assign(runtimeConfig, next);
    return syncBridge().config;
}

export function debugLog(message: string, detail?: unknown): void {
    if (!runtimeConfig.debug || typeof console === 'undefined') {
        return;
    }

    if (detail === undefined) {
        console.debug(`[TinyEngine] ${message}`);
        return;
    }

    console.debug(`[TinyEngine] ${message}`, detail);
}

export function warn(message: string, detail?: unknown): void {
    if (!runtimeConfig.warnings || typeof console === 'undefined') {
        return;
    }

    if (detail === undefined) {
        console.warn(`[TinyEngine] ${message}`);
        return;
    }

    console.warn(`[TinyEngine] ${message}`, detail);
}

export function warnOnce(message: string, detail?: unknown): void {
    const key = detail === undefined ? message : `${message}:${String(detail)}`;
    if (warnedMessages.has(key)) {
        return;
    }

    warnedMessages.add(key);
    const warning = {
        message,
        detail,
        timestamp: Date.now()
    };
    warnings.push(warning);
    limitBuffer(warnings, maxWarnings);
    syncBridge();
    warn(message, detail);
}

export function pushDevtoolsEvent(type: string, payload?: unknown): void {
    events.push({
        type,
        payload,
        timestamp: Date.now()
    });
    limitBuffer(events, maxEvents);
    syncBridge();
}

export function registerCapsuleDefinition(snapshot: TinyEngineRegistrySnapshot): void {
    registry.set(snapshot.name, {
        ...snapshot,
        defaults: cloneValue(snapshot.defaults)
    });
    syncBridge();
}

export function registerPluginSnapshot(snapshot: TinyEnginePluginSnapshot): void {
    plugins.set(snapshot.name, snapshot);
    syncBridge();
}

export function registerInstanceSnapshot(snapshot: TinyEngineCapsuleSnapshot): void {
    instances.set(snapshot.uid, {
        ...snapshot,
        options: cloneValue(snapshot.options),
        props: cloneValue(snapshot.props),
        refNames: [...snapshot.refNames]
    });
    syncBridge();
}

export function unregisterInstanceSnapshot(uid: string): void {
    instances.delete(uid);
    syncBridge();
}

export function registerStoreSnapshot(snapshot: TinyEngineStoreSnapshot): void {
    stores.set(snapshot.id, {
        ...snapshot,
        state: cloneValue(snapshot.state)
    });
    syncBridge();
}

export function unregisterStoreSnapshot(id: string): void {
    stores.delete(id);
    syncBridge();
}

export function getDevtoolsSnapshot(): TinyEngineDevtoolsSnapshot {
    return {
        version: ENGINE_VERSION,
        config: { ...runtimeConfig },
        registry: Array.from(registry.values()).map((entry) => ({
            ...entry,
            defaults: cloneValue(entry.defaults)
        })),
        plugins: Array.from(plugins.values()).map((entry) => ({ ...entry })),
        instances: Array.from(instances.values()).map((entry) => ({
            ...entry,
            options: cloneValue(entry.options),
            props: cloneValue(entry.props),
            refNames: [...entry.refNames]
        })),
        stores: Array.from(stores.values()).map((entry) => ({
            ...entry,
            state: cloneValue(entry.state)
        })),
        warnings: warnings.map((entry) => ({ ...entry })),
        events: events.map((entry) => ({ ...entry }))
    };
}

export function getDevtoolsBridge(): TinyEngineDevtoolsBridge {
    return syncBridge();
}

export function describeElement(el: HTMLElement): string {
    const id = el.id ? `#${el.id}` : '';
    const classes = el.classList.length ? `.${Array.from(el.classList).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${classes}`;
}

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
    } catch {
        warnOnce('Failed to parse JSON option value.', { value: v });
    }

    return v;
}

export function readOptions(
    el: HTMLElement,
    name: string,
    prefix: string = 'ui'
): Record<string, unknown> {
    const opts: Record<string, unknown> = {};
    const optionPrefix = `${prefix}-${name}-`;

    const json = el.getAttribute(`${prefix}-${name}`);
    if (json) {
        try {
            Object.assign(opts, JSON.parse(json) as object);
        } catch {
            warnOnce(`Failed to parse ${prefix}-${name} JSON options.`, {
                element: describeElement(el),
                value: json
            });
        }
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
        warnOnce('Invalid data target selector.', {
            selector,
            trigger: describeElement(trigger)
        });
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

declare global {
    var __TINY_ENGINE__: TinyEngineDevtoolsBridge | undefined;

    interface Window {
        __TINY_ENGINE__?: TinyEngineDevtoolsBridge;
    }
}
