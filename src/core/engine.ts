import { Capsule, CapsuleInspection, CapsuleOptions } from './base';
import type { CapsuleListener, CapsuleStore } from './store';
import {
    debugLog,
    describeElement,
    getDataAction,
    getDataTarget,
    getDevtoolsBridge,
    getRuntimeConfig,
    invokeAction,
    pushDevtoolsEvent,
    readOptions,
    recordMetric,
    registerCapsuleDefinition,
    registerInstanceSnapshot,
    registerPluginSnapshot,
    unregisterInstanceSnapshot,
    updateRuntimeConfig,
    warnOnce
} from './utils';

export interface CapsuleCtor<
    T extends Capsule = Capsule,
    O extends CapsuleOptions = CapsuleOptions
> {
    selector?: string;
    defaults?: Partial<O>;
    new(el: HTMLElement, options: O): T;
}

export interface FunctionalCapsuleApi<
    O extends CapsuleOptions = CapsuleOptions
> {
    readonly el: HTMLElement;
    readonly uid: string;
    readonly options: O;
    readonly props: O;
    readonly refs: Record<string, HTMLElement>;
    on(
        el: EventTarget,
        evt: string,
        fn: EventListenerOrEventListenerObject,
        opts?: AddEventListenerOptions | boolean
    ): void;
    offAll(): void;
    emit<T = unknown>(
        name: string,
        detail?: T,
        options?: { cancelable?: boolean }
    ): CustomEvent<T>;
    refresh(root?: ParentNode): void;
    syncOptions(nextOptions: O): void;
    onPropChange(prop: string, listener: (newValue: unknown, oldValue: unknown, key: string) => void): void;
    connectStore<S extends Record<string, any>>(
        store: CapsuleStore<S>,
        listener: CapsuleListener<S>
    ): void;
}

export type FunctionalCapsuleHooks<
    O extends CapsuleOptions = CapsuleOptions
> = Partial<{
    destroy(): void;
    refresh(root?: ParentNode): void;
    syncOptions(nextOptions: O, previousOptions: O): void;
}> & Record<string, unknown>;

export interface CapsuleFn<
    O extends CapsuleOptions = CapsuleOptions
> {
    selector?: string;
    defaults?: Partial<O>;
    (el: HTMLElement, api: FunctionalCapsuleApi<O>): void | FunctionalCapsuleHooks<O>;
}

export type CapsuleDefinition<
    T extends Capsule = Capsule,
    O extends CapsuleOptions = CapsuleOptions
> = CapsuleCtor<T, O> | CapsuleFn<O>;

type Registry = Record<string, CapsuleCtor>;
type InstanceMap = Record<string, Capsule>;

export interface UIOptions {
    prefix?: string;
    debug?: boolean;
    warnings?: boolean;
    hydrate?: boolean;
}

export interface UIPluginContext {
    config(options: UIOptions): void;
    register(name: string, definition: CapsuleDefinition): void;
    scan(root?: ParentNode | null): void;
    destroy(root?: ParentNode | null): void;
    on(
        eventName: string,
        listener: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean
    ): () => void;
    off(
        eventName: string,
        listener: EventListenerOrEventListenerObject,
        options?: EventListenerOptions | boolean
    ): void;
    emit<T = unknown>(
        eventName: string,
        detail?: T,
        options?: { cancelable?: boolean }
    ): CustomEvent<T>;
    getPrefix(): string;
    devtools(): ReturnType<typeof getDevtoolsBridge>;
    hook<K extends UIPluginHookName>(
        name: K,
        handler: UIPluginHookHandler<K>
    ): () => void;
    expose(name: string, value: unknown): void;
    warn(message: string, detail?: unknown): void;
    debug(message: string, detail?: unknown): void;
}

export interface UIPluginObject {
    name?: string;
    version?: string;
    install: UIPluginInstaller;
}

export type UIPluginInstaller = (
    ui: UIPluginContext
) => void | (() => void) | { destroy?(): void };

export type UIPlugin = UIPluginObject | UIPluginInstaller;

export interface UIPluginHookPayloadMap {
    config: { options: UIOptions };
    register: { name: string; definition: CapsuleDefinition };
    create: { name: string; instance: Capsule; el: HTMLElement };
    destroy: { name: string; instance: Capsule; el: HTMLElement };
    init: { root: ParentNode };
    scan: { root: ParentNode };
    action: { name: string; action: string; trigger: HTMLElement; target: HTMLElement; instance: Capsule; event: Event };
    actionComplete: { name: string; action: string; trigger: HTMLElement; target: HTMLElement; instance: Capsule; result: unknown };
    actionError: { name: string; action: string; trigger: HTMLElement; target: HTMLElement; instance: Capsule; error: unknown };
    emit: { eventName: string; detail?: unknown; event: CustomEvent<unknown> };
}

export type UIPluginHookName = keyof UIPluginHookPayloadMap;
export type UIPluginHookHandler<K extends UIPluginHookName> = (payload: UIPluginHookPayloadMap[K]) => void | Promise<void>;

declare global {
    interface HTMLElement {
        __ui?: InstanceMap;
    }
}

export function getPrefix() {
    return getRuntimeConfig().prefix;
}

class FunctionalCapsule<O extends CapsuleOptions = CapsuleOptions> extends Capsule {
    static selector?: string;
    static defaults?: Partial<CapsuleOptions>;

    private _hooks: FunctionalCapsuleHooks<O> = {};

    constructor(
        el: HTMLElement,
        options: O,
        handler: CapsuleFn<O>
    ) {
        super(el, options);

        const hooks = handler(el, this.createApi()) || {};
        this._hooks = hooks;

        Object.keys(hooks).forEach((key) => {
            if (key === 'destroy' || key === 'refresh' || key === 'syncOptions') {
                return;
            }

            (this as unknown as Record<string, unknown>)[key] = hooks[key];
        });
    }

    override syncOptions(nextOptions: O): void {
        const previousOptions = { ...this.options } as O;
        super.syncOptions(nextOptions);
        this._hooks?.syncOptions?.(nextOptions, previousOptions);
    }

    override refresh(root: ParentNode = this.el): void {
        super.refresh(root);
        this._hooks?.refresh?.(root);
    }

    override destroy(): void {
        this._hooks?.destroy?.();
        super.destroy();
    }

    private createApi(): FunctionalCapsuleApi<O> {
        const self = this;

        return {
            get el() {
                return self.el;
            },
            get uid() {
                return self.uid;
            },
            get options() {
                return self.options as O;
            },
            get props() {
                return self.props as O;
            },
            get refs() {
                return self.refs;
            },
            on: (el, evt, fn, opts) => this.on(el, evt, fn, opts),
            offAll: () => this.offAll(),
            emit: (name, detail, options) => this.emit(name, detail, options),
            refresh: (root) => this.refresh(root),
            syncOptions: (nextOptions) => this.syncOptions(nextOptions),
            onPropChange: (prop, listener) => this.onPropChange(prop, listener),
            connectStore: (store, listener) => this.connectStore(store, listener)
        };
    }
}

function isCapsuleCtor(definition: CapsuleDefinition): definition is CapsuleCtor {
    return definition === Capsule || definition.prototype instanceof Capsule;
}

function createHookBucket(): {
    [K in UIPluginHookName]: Set<UIPluginHookHandler<K>>;
} {
    return {
        config: new Set<UIPluginHookHandler<'config'>>(),
        register: new Set<UIPluginHookHandler<'register'>>(),
        create: new Set<UIPluginHookHandler<'create'>>(),
        destroy: new Set<UIPluginHookHandler<'destroy'>>(),
        init: new Set<UIPluginHookHandler<'init'>>(),
        scan: new Set<UIPluginHookHandler<'scan'>>(),
        action: new Set<UIPluginHookHandler<'action'>>(),
        actionComplete: new Set<UIPluginHookHandler<'actionComplete'>>(),
        actionError: new Set<UIPluginHookHandler<'actionError'>>(),
        emit: new Set<UIPluginHookHandler<'emit'>>()
    };
}

function getPluginName(plugin: UIPlugin, index: number): string {
    if (typeof plugin === 'function') {
        return plugin.name || `plugin-${index}`;
    }

    return plugin.name || plugin.install.name || `plugin-${index}`;
}

function toInstanceSnapshot(name: string, inspection: CapsuleInspection) {
    return {
        ...inspection,
        name
    };
}

export const UI = (() => {
    const registry: Registry = {};
    const hooks = createHookBucket();
    const installedPlugins = new WeakSet<object>();
    let observing = false;
    let dataApiBound = false;
    let pluginCount = 0;
    const bus = new EventTarget();
    let publicApi: {
        config: typeof config;
        register: typeof register;
        init: typeof init;
        scan: typeof scan;
        destroy: typeof destroy;
        observe: typeof observe;
        getOrCreate: typeof getOrCreate;
        getPrefix: typeof getPrefix;
        on: typeof on;
        off: typeof off;
        emit: typeof emit;
        use: typeof use;
        devtools: typeof devtools;
    };

    const config = (options: UIOptions = {}) => {
        const next: UIOptions = {};

        if (options.prefix) {
            next.prefix = options.prefix;
        }
        if (typeof options.debug === 'boolean') {
            next.debug = options.debug;
        }
        if (typeof options.warnings === 'boolean') {
            next.warnings = options.warnings;
        }
        if (typeof options.hydrate === 'boolean') {
            next.hydrate = options.hydrate;
        }

        updateRuntimeConfig(next);
        pushDevtoolsEvent('ui:config', { ...getRuntimeConfig() });
        triggerHook('config', { options: next });
    };

    function register(name: string, definition: CapsuleDefinition): void {
        if (registry[name]) {
            warnOnce(`Component "${name}" is being re-registered.`, { name });
        }

        let Ctor: CapsuleCtor;
        let kind: 'class' | 'function' = 'class';

        if (isCapsuleCtor(definition)) {
            Ctor = definition;
        } else {
            kind = 'function';
            const handler = definition;

            Ctor = class FunctionalCapsuleAdapter extends FunctionalCapsule {
                static override selector?: string;
                static override defaults = handler.defaults;

                constructor(el: HTMLElement, options: CapsuleOptions) {
                    super(el, options, handler);
                }
            };
        }

        Ctor.selector = name;
        registry[name] = Ctor;
        registerCapsuleDefinition({
            name,
            kind,
            selector: name,
            defaults: { ...(Ctor.defaults || {}) }
        });
        pushDevtoolsEvent('ui:register', { name, kind });
        triggerHook('register', { name, definition });
    }

    function resolveOptions(
        el: HTMLElement,
        name: string,
        options?: CapsuleOptions
    ): CapsuleOptions {
        return Object.assign(
            {},
            registry[name]?.defaults || {},
            readOptions(el, name, getPrefix()),
            options || {}
        );
    }

    function syncInstance(name: string, instance: Capsule): void {
        registerInstanceSnapshot(toInstanceSnapshot(name, instance.inspect()));
    }

    const scheduleFrame = (callback: () => void) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(callback);
            return;
        }

        setTimeout(callback, 0);
    };

    const scheduleMicrotask = (callback: () => void) => {
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(callback);
            return;
        }

        Promise.resolve().then(callback);
    };

    const scheduledTasks = new Set<() => void>();
    let flushQueued = false;

    function scheduleDomTask(task: () => void): void {
        scheduledTasks.add(task);

        if (flushQueued) {
            return;
        }

        flushQueued = true;
        scheduleMicrotask(() => {
            scheduleFrame(flushScheduledTasks);
        });
    }

    function flushScheduledTasks(): void {
        flushQueued = false;
        const tasks = Array.from(scheduledTasks);
        scheduledTasks.clear();
        const startedAt = performanceNow();

        for (const task of tasks) {
            task();
        }

        recordMetric('flushes');
        recordMetric('lastFlushDuration', performanceNow() - startedAt);
        pushDevtoolsEvent('ui:scheduler:flush', {
            tasks: tasks.length,
            duration: performanceNow() - startedAt
        });
    }

    function performanceNow(): number {
        return typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
    }

    function getOrCreate<T extends Capsule = Capsule>(
        el: HTMLElement,
        name: string,
        options?: CapsuleOptions
    ): T | null {
        const Ctor = registry[name] as CapsuleCtor<T> | undefined;
        if (!Ctor) {
            warnOnce(`Component "${name}" is not registered.`, {
                element: describeElement(el),
                name
            });
            return null;
        }

        if (!el.__ui) {
            el.__ui = {};
        }

        if (!el.__ui[name]) {
            const instance = new Ctor(el, resolveOptions(el, name, options) as never);
            el.__ui[name] = instance;
            (el as unknown as Record<string, unknown>)[name] = instance;
            syncInstance(name, instance);
            recordMetric('creates');
            pushDevtoolsEvent('ui:create', {
                name,
                uid: instance.inspect().uid,
                element: el
            });
            triggerHook('create', { name, instance, el });
        } else if (options) {
            const nextOptions = resolveOptions(el, name, options);
            if (!getRuntimeConfig().hydrate || !optionsEqual(el.__ui[name].inspect().options, nextOptions)) {
                el.__ui[name].syncOptions(nextOptions);
                recordMetric('syncs');
                syncInstance(name, el.__ui[name]);
            }
        }

        return el.__ui[name] as T;
    }

    function optionsEqual(
        previous: Record<string, unknown>,
        next: Record<string, unknown>
    ): boolean {
        const previousKeys = Object.keys(previous);
        const nextKeys = Object.keys(next);

        if (previousKeys.length !== nextKeys.length) {
            return false;
        }

        for (const key of previousKeys) {
            if (previous[key] !== next[key]) {
                return false;
            }
        }

        return true;
    }

    function findMatches(root: ParentNode, selector: string): HTMLElement[] {
        if (root instanceof HTMLElement && root.matches(selector)) {
            return [root, ...Array.from(root.querySelectorAll<HTMLElement>(selector))];
        }

        return 'querySelectorAll' in root
            ? Array.from(root.querySelectorAll<HTMLElement>(selector))
            : [];
    }

    function scan(root?: ParentNode | null): void {
        if (typeof document === 'undefined' || root === null) {
            return;
        }

        const target = root || document;
        const startedAt = performanceNow();
        const prefix = getPrefix();
        bindDataApi();

        for (const name of Object.keys(registry)) {
            findMatches(target, `[${prefix}-${name}]`)
                .forEach((el) => getOrCreate(el, name));
        }

        recordMetric('scans');
        recordMetric('lastScanDuration', performanceNow() - startedAt);
        triggerHook('scan', { root: target });
        pushDevtoolsEvent('ui:scan', {
            root: target instanceof HTMLElement ? target : document.documentElement
        });
    }

    function init(root?: ParentNode | null): void {
        if (typeof document === 'undefined' || root === null) {
            return;
        }

        const target = root || document;
        scan(target);
        triggerHook('init', { root: target });
        pushDevtoolsEvent('ui:init', {
            root: target instanceof HTMLElement ? target : document.documentElement
        });
    }

    function destroyInstance(el: HTMLElement, name: string): void {
        const instance = el.__ui?.[name];
        if (!instance) {
            return;
        }

        triggerHook('destroy', { name, instance, el });
        unregisterInstanceSnapshot(instance.inspect().uid);
        instance.destroy();
        recordMetric('destroys');
        delete el.__ui?.[name];

        if (Object.keys(el.__ui || {}).length === 0) {
            delete el.__ui;
        }

        if ((el as unknown as Record<string, unknown>)[name] === instance) {
            delete (el as unknown as Record<string, unknown>)[name];
        }
    }

    function destroyTree(node: Node): void {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        for (const name of Object.keys(node.__ui || {})) {
            destroyInstance(node, name);
        }

        for (const el of node.querySelectorAll<HTMLElement>('*')) {
            for (const name of Object.keys(el.__ui || {})) {
                destroyInstance(el, name);
            }
        }
    }

    function destroy(root?: ParentNode | null): void {
        if (typeof document === 'undefined' || root === null) {
            return;
        }

        const target = root || document;

        if (!root && observer) {
            observer.disconnect();
            observing = false;
        }

        if (!root && dataApiBound) {
            document.removeEventListener('click', handleDataApiClick);
            dataApiBound = false;
        }

        if (!root) {
            scheduledTasks.clear();
            flushQueued = false;
        }

        if (target instanceof HTMLElement) {
            destroyTree(target);
        } else if (target instanceof Document) {
            destroyTree(target.documentElement);
        }

        pushDevtoolsEvent('ui:destroy', {
            root: target instanceof HTMLElement ? target : document.documentElement
        });
    }

    function refreshOwners(node: Node): void {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const owners = new Set<Capsule>();
        let current: HTMLElement | null = node;

        while (current) {
            if (current.__ui) {
                for (const name of Object.keys(current.__ui)) {
                    owners.add(current.__ui[name]);
                }
            }
            current = current.parentElement;
        }

        for (const instance of owners) {
            instance.refresh(node);
        }
    }

    function syncAttributeChange(el: HTMLElement, attributeName: string): void {
        if (attributeName === 'ref' || attributeName.startsWith('@')) {
            refreshOwners(el);
        }

        const prefix = getPrefix();

        for (const name of Object.keys(registry)) {
            const marker = `${prefix}-${name}`;
            const optionPrefix = `${marker}-`;

            if (attributeName !== marker && !attributeName.startsWith(optionPrefix)) {
                continue;
            }

            if (el.hasAttribute(marker)) {
                const instance = getOrCreate(el, name);
                const nextOptions = resolveOptions(el, name);
                if (instance && (!getRuntimeConfig().hydrate || !optionsEqual(instance.inspect().options, nextOptions))) {
                    instance.syncOptions(nextOptions);
                    recordMetric('syncs');
                }
                instance?.refresh();
                if (instance) {
                    syncInstance(name, instance);
                }
            } else {
                destroyInstance(el, name);
            }
        }
    }

    const observer = typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            scheduleDomTask(() => {
                                scan(node);
                                refreshOwners(node);
                            });
                        }
                    }

                    for (const node of mutation.removedNodes) {
                        scheduleDomTask(() => destroyTree(node));
                    }
                }

                if (
                    mutation.type === 'attributes' &&
                    mutation.target instanceof HTMLElement &&
                    mutation.attributeName
                ) {
                    const target = mutation.target;
                    const attributeName = mutation.attributeName;
                    scheduleDomTask(() => syncAttributeChange(target, attributeName));
                }
            }
        });

    function observe(): void {
        if (observing || typeof document === 'undefined' || !observer) {
            return;
        }

        observing = true;
        bindDataApi();
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });
        pushDevtoolsEvent('ui:observe');
    }

    function on(
        eventName: string,
        listener: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean
    ): () => void {
        bus.addEventListener(eventName, listener, options);
        return () => bus.removeEventListener(eventName, listener, options);
    }

    function off(
        eventName: string,
        listener: EventListenerOrEventListenerObject,
        options?: EventListenerOptions | boolean
    ): void {
        bus.removeEventListener(eventName, listener, options);
    }

    function emit<T = unknown>(
        eventName: string,
        detail?: T,
        options: { cancelable?: boolean } = {}
    ): CustomEvent<T> {
        const event = new CustomEvent<T>(eventName, {
            detail,
            cancelable: options.cancelable ?? false
        });

        bus.dispatchEvent(event);
        recordMetric('emits');
        pushDevtoolsEvent('ui:emit', {
            eventName,
            detail,
            cancelable: event.cancelable
        });
        triggerHook('emit', {
            eventName,
            detail,
            event: event as CustomEvent<unknown>
        });
        return event;
    }

    function bindDataApi(): void {
        if (dataApiBound || typeof document === 'undefined') {
            return;
        }

        dataApiBound = true;
        document.addEventListener('click', handleDataApiClick);
    }

    function handleDataApiClick(event: Event): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const trigger = target.closest<HTMLElement>(`[data-${getPrefix()}-toggle]`);
        if (!trigger) {
            return;
        }

        const name = trigger.getAttribute(`data-${getPrefix()}-toggle`);
        if (!name) {
            warnOnce('Data API trigger is missing a component name.', {
                trigger: describeElement(trigger)
            });
            return;
        }

        const host = getDataTarget(trigger, getPrefix());
        if (!host) {
            warnOnce(`Unable to resolve target for data API component "${name}".`, {
                trigger: describeElement(trigger)
            });
            return;
        }

        const instance = getOrCreate(host, name);
        if (!instance) {
            return;
        }

        const action = getDataAction(trigger, getPrefix());
        const result = invokeAction(
            instance as unknown as Record<string, unknown>,
            action,
            event,
            trigger
        );

        triggerHook('action', {
            name,
            action,
            trigger,
            target: host,
            instance,
            event
        });

        if (typeof result === 'undefined') {
            warnOnce(`Action "${action}" is not available on component "${name}".`, {
                target: describeElement(host)
            });
        } else if (isThenable(result)) {
            result
                .then((value: unknown) => {
                    triggerHook('actionComplete', {
                        name,
                        action,
                        trigger,
                        target: host,
                        instance,
                        result: value
                    });
                })
                .catch((error: unknown) => {
                    triggerHook('actionError', {
                        name,
                        action,
                        trigger,
                        target: host,
                        instance,
                        error
                    });
                });
        } else {
            triggerHook('actionComplete', {
                name,
                action,
                trigger,
                target: host,
                instance,
                result
            });
        }

        emit('dataapi:trigger', {
            name,
            action,
            trigger,
            target: host,
            instance
        });

        if (result === false || trigger.tagName === 'A') {
            event.preventDefault();
        }
    }

    function isThenable(value: unknown): value is Promise<unknown> {
        return Boolean(value && typeof (value as Promise<unknown>).then === 'function');
    }

    function triggerHook<K extends UIPluginHookName>(
        name: K,
        payload: UIPluginHookPayloadMap[K]
    ): void {
        for (const handler of hooks[name]) {
            try {
                const result = handler(payload as never);
                if (isThenable(result)) {
                    result.catch((error) => {
                        warnOnce(`Plugin hook "${name}" failed.`, error);
                    });
                }
            } catch (error) {
                warnOnce(`Plugin hook "${name}" failed.`, error);
            }
        }
    }

    function hook<K extends UIPluginHookName>(
        name: K,
        handler: UIPluginHookHandler<K>
    ): () => void {
        hooks[name].add(handler as never);
        return () => hooks[name].delete(handler as never);
    }

    function devtools() {
        return getDevtoolsBridge();
    }

    function use(plugin: UIPlugin) {
        if (installedPlugins.has(plugin as object)) {
            warnOnce(`Plugin "${getPluginName(plugin, pluginCount)}" has already been installed.`);
            return publicApi;
        }

        pluginCount += 1;
        installedPlugins.add(plugin as object);
        const pluginName = getPluginName(plugin, pluginCount);
        const installer = typeof plugin === 'function' ? plugin : plugin.install;
        const version = typeof plugin === 'function' ? undefined : plugin.version;
        const teardownFns: Array<() => void> = [];

        const context: UIPluginContext = {
            config,
            register,
            scan,
            destroy,
            on,
            off,
            emit,
            getPrefix,
            devtools,
            hook: (name, handler) => {
                const offHook = hook(name, handler as never);
                teardownFns.push(offHook);
                return offHook;
            },
            expose: (name, value) => {
                (globalThis as Record<string, unknown>)[name] = value;
                pushDevtoolsEvent('plugin:expose', { plugin: pluginName, name });
            },
            warn: (message, detail) => warnOnce(`[${pluginName}] ${message}`, detail),
            debug: (message, detail) => debugLog(`[${pluginName}] ${message}`, detail)
        };

        const installed = installer(context);
        if (typeof installed === 'function') {
            teardownFns.push(installed);
        } else if (installed && typeof installed === 'object' && typeof installed.destroy === 'function') {
            teardownFns.push(() => installed.destroy?.());
        }

        registerPluginSnapshot({
            name: pluginName,
            version,
            installedAt: Date.now()
        });
        pushDevtoolsEvent('plugin:install', { name: pluginName, version });

        return publicApi;
    }

    publicApi = {
        config,
        register,
        init,
        scan,
        destroy,
        observe,
        getOrCreate,
        getPrefix,
        on,
        off,
        emit,
        use,
        devtools
    };

    return publicApi;
})();
