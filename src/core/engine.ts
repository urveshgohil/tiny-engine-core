import { Capsule, CapsuleOptions } from './base';
import type { CapsuleListener, CapsuleStore } from './store';
import { getDataAction, getDataTarget, invokeAction, readOptions } from './utils';

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

declare global {
    interface HTMLElement {
        __ui?: InstanceMap;
    }
}

export interface UIOptions {
    prefix?: string;
}

let prefix = 'ui';

export function getPrefix() {
    return prefix;
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
        this._hooks.syncOptions?.(nextOptions, previousOptions);
    }

    override refresh(root: ParentNode = this.el): void {
        super.refresh(root);
        this._hooks.refresh?.(root);
    }

    override destroy(): void {
        this._hooks.destroy?.();
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

export const UI = (() => {
    const registry: Registry = {};
    let observing = false;
    let dataApiBound = false;
    const bus = new EventTarget();

    const config = (options: UIOptions = {}) => {
        if (options.prefix) {
            prefix = options.prefix;
        }
    };

    function register(name: string, definition: CapsuleDefinition): void {
        let Ctor: CapsuleCtor;

        if (isCapsuleCtor(definition)) {
            Ctor = definition;
        } else {
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
    }

    function resolveOptions(
        el: HTMLElement,
        name: string,
        options?: CapsuleOptions
    ): CapsuleOptions {
        return Object.assign(
            {},
            registry[name]?.defaults || {},
            readOptions(el, name, prefix),
            options || {}
        );
    }

    function getOrCreate<T extends Capsule = Capsule>(
        el: HTMLElement,
        name: string,
        options?: CapsuleOptions
    ): T | null {
        const Ctor = registry[name] as CapsuleCtor<T> | undefined;
        if (!Ctor) {
            return null;
        }

        if (!el.__ui) {
            el.__ui = {};
        }

        if (!el.__ui[name]) {
            const instance = new Ctor(el, resolveOptions(el, name, options) as never);
            el.__ui[name] = instance;
            (el as unknown as Record<string, unknown>)[name] = instance;
        } else if (options) {
            el.__ui[name].syncOptions(resolveOptions(el, name, options));
        }

        return el.__ui[name] as T;
    }

    function findMatches(root: ParentNode, selector: string): HTMLElement[] {
        if (root instanceof HTMLElement && root.matches(selector)) {
            return [root, ...Array.from(root.querySelectorAll<HTMLElement>(selector))];
        }

        return 'querySelectorAll' in root
            ? Array.from(root.querySelectorAll<HTMLElement>(selector))
            : [];
    }

    function init(root: ParentNode = document): void {
        bindDataApi();

        Object.keys(registry).forEach((name) => {
            findMatches(root, `[${prefix}-${name}]`)
                .forEach((el) => getOrCreate(el, name));
        });
    }

    function destroyInstance(el: HTMLElement, name: string): void {
        const instance = el.__ui?.[name];
        if (!instance) {
            return;
        }

        instance.destroy();
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

        const nodes = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))];

        for (const el of nodes) {
            for (const name of Object.keys(el.__ui || {})) {
                destroyInstance(el, name);
            }
        }
    }

    function refreshOwners(node: Node): void {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const owners = new Set<Capsule>();
        let current: HTMLElement | null = node;

        while (current) {
            for (const instance of Object.values(current.__ui || {})) {
                owners.add(instance);
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

        Object.keys(registry).forEach((name) => {
            const marker = `${prefix}-${name}`;
            const optionPrefix = `${marker}-`;

            if (attributeName !== marker && !attributeName.startsWith(optionPrefix)) {
                return;
            }

            if (el.hasAttribute(marker)) {
                const instance = getOrCreate(el, name);
                instance?.syncOptions(resolveOptions(el, name));
                instance?.refresh();
            } else {
                destroyInstance(el, name);
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        init(node);
                        refreshOwners(node);
                    }
                }

                for (const node of mutation.removedNodes) {
                    destroyTree(node);
                }
            }

            if (
                mutation.type === 'attributes' &&
                mutation.target instanceof HTMLElement &&
                mutation.attributeName
            ) {
                syncAttributeChange(mutation.target, mutation.attributeName);
            }
        }
    });

    function observe(): void {
        if (observing) {
            return;
        }

        observing = true;
        bindDataApi();
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });
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

        const trigger = target.closest<HTMLElement>(`[data-${prefix}-toggle]`);
        if (!trigger) {
            return;
        }

        const name = trigger.getAttribute(`data-${prefix}-toggle`);
        if (!name) {
            return;
        }

        const host = getDataTarget(trigger, prefix);
        if (!host) {
            return;
        }

        const instance = getOrCreate(host, name);
        if (!instance) {
            return;
        }

        const action = getDataAction(trigger, prefix);
        const result = invokeAction(
            instance as unknown as Record<string, unknown>,
            action,
            event,
            trigger
        );

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

    return {
        config,
        register,
        init,
        observe,
        getOrCreate,
        getPrefix,
        on,
        off,
        emit
    };
})();
