import { generateUID, registerUID } from './uid';
import type { CapsuleStore, CapsuleListener } from './store';
import { getPrefix } from './engine';

export type EventHandle = [
    EventTarget,
    string,
    EventListenerOrEventListenerObject,
    AddEventListenerOptions | boolean | undefined
];

export interface CapsuleOptions {
    [key: string]: unknown;
}

export interface PropsChangeListener {
    (newValue: unknown, oldValue: unknown, key: string): void;
}
export class Capsule {
    protected el: HTMLElement;
    protected options: CapsuleOptions;
    protected uid: string;

    private _handles: EventHandle[] = [];
    private _propsListeners = new Map<string, PropsChangeListener[]>();
    private _propsProxy?: CapsuleOptions;
    private _refs: Record<string, HTMLElement> = {};
    private _refsProxy?: Record<string, HTMLElement>;
    private _storeUnsubs: (() => void)[] = [];
    private _directiveEvents = new Set<string>();


    constructor(el: HTMLElement, options: CapsuleOptions = {}) {
        this.el = el;
        this.options = { ...options };

        const prefix = getPrefix();
        const idAttr = `${prefix}-id`;
        const scope = `${prefix}-${this.constructor.name.toLowerCase()}`;

        const existingId = el.getAttribute(idAttr);

        if (existingId) {
            // SSR / hydration
            this.uid = existingId;
            registerUID(existingId);
        } else {
            // Client-side
            this.uid = generateUID(scope);
            el.setAttribute(idAttr, this.uid);
        }

        this.refresh();
    }

    /* ---------------- PROPS ---------------- */
    get props() {
        if (!this._propsProxy) {
            this._propsProxy = new Proxy(this.options, {
                set: (target, prop: string, value) => {
                    const oldValue = target[prop];
                    target[prop] = value;
                    this._notifyPropsListeners(prop, value, oldValue);
                    return true;
                }
            });
        }

        return this._propsProxy;
    }

    onPropChange(prop: string, listener: PropsChangeListener): void {
        if (!this._propsListeners.has(prop)) {
            this._propsListeners.set(prop, []);
        }
        this._propsListeners.get(prop)!.push(listener);
    }

    /* ---------------- STORE ---------------- */

    protected connectStore<S extends Record<string, any>>(
        store: CapsuleStore<S>,
        listener: CapsuleListener<S>
    ): void {
        const unsub = store.connect(listener);
        this._storeUnsubs.push(unsub);
    }

    /* ---------------- REFS ---------------- */

    get refs(): Record<string, HTMLElement> {
        if (!this._refsProxy) {
            this._refsProxy = new Proxy(this._refs, {
                get: (target, prop: string | symbol) => {
                    if (typeof prop !== 'string') {
                        return Reflect.get(target, prop);
                    }

                    const current = target[prop];
                    if (current?.isConnected) {
                        return current;
                    }

                    const found = this._findRef(prop);
                    if (found) {
                        target[prop] = found;
                    }

                    return found;
                }
            }) as Record<string, HTMLElement>;
        }

        return this._refsProxy;
    }

    private _notifyPropsListeners(prop: string, newValue: unknown, oldValue: unknown): void {
        this._propsListeners.get(prop)?.forEach(fn =>
            fn(newValue, oldValue, prop)
        );
    }

    syncOptions(nextOptions: CapsuleOptions): void {
        const previous = this.options;
        const next = { ...nextOptions };
        const keys = new Set<string>();

        for (const key of Object.keys(previous)) {
            keys.add(key);
        }

        for (const key of Object.keys(next)) {
            keys.add(key);
        }

        this.options = next;
        this._propsProxy = undefined;

        for (const key of keys) {
            const oldValue = previous[key];
            const newValue = next[key];

            if (oldValue !== newValue) {
                this._notifyPropsListeners(key, newValue, oldValue);
            }
        }
    }

    refresh(root: ParentNode = this.el): void {
        this._collectRefs(root);
        this._processDirectives(root);
    }

    private _collectRefs(root: ParentNode): void {
        if (root instanceof HTMLElement && root.hasAttribute('ref')) {
            const name = root.getAttribute('ref');
            if (name) {
                this._refs[name] = root;
            }
        }

        if (!(root instanceof Element)) {
            return;
        }

        for (const el of root.querySelectorAll<HTMLElement>('[ref]')) {
            const name = el.getAttribute('ref');
            if (name) this._refs[name] = el;
        }
    }

    private _findRef(name: string): HTMLElement | undefined {
        if (this.el.getAttribute('ref') === name) {
            return this.el;
        }

        return Array.from(this.el.querySelectorAll<HTMLElement>('[ref]'))
            .find((el) => el.getAttribute('ref') === name);
    }

    /* ---------------- DIRECTIVES ---------------- */

    private _processDirectives(root: ParentNode): void {
        const elements = root instanceof Element
            ? [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
            : [];

        for (const el of elements) {
            for (const attr of Array.from(el.attributes)) {
                if (!attr.name.startsWith('@')) {
                    continue;
                }

                this._ensureDirectiveListener(attr.name.slice(1));
            }
        }
    }

    private _ensureDirectiveListener(eventName: string): void {
        if (this._directiveEvents.has(eventName)) {
            return;
        }

        this._directiveEvents.add(eventName);

        this.on(this.el, eventName, (event: Event) => {
            const source = this._findDirectiveTarget(event);
            if (!source) {
                return;
            }

            const expr = source.getAttribute(`@${eventName}`);
            if (!expr) {
                return;
            }

            const result = this._runDirective(expr, event, source);
            if (result === false) {
                event.preventDefault();
            }

            this.emit('directive', {
                event: eventName,
                expr,
                target: source
            });
        });
    }

    private _findDirectiveTarget(event: Event): HTMLElement | null {
        let node = event.target instanceof HTMLElement
            ? event.target
            : event.target instanceof Node
                ? event.target.parentElement
                : null;

        while (node && this.el.contains(node)) {
            if (node.hasAttribute(`@${event.type}`)) {
                return node;
            }

            if (node === this.el) {
                break;
            }

            node = node.parentElement;
        }

        return this.el.hasAttribute(`@${event.type}`) ? this.el : null;
    }

    private _runDirective(expr: string, event: Event, source: HTMLElement): unknown {
        try {
            const evaluator = new Function(
                '$event',
                '$el',
                '$component',
                '$refs',
                '$props',
                '$options',
                `
                    with ($options) {
                        with ($props) {
                            with ($refs) {
                                with ($component) {
                                    with (window) {
                                        return (${expr});
                                    }
                                }
                            }
                        }
                    }
                `
            );

            const result = evaluator.call(
                window,
                event,
                source,
                this,
                this.refs,
                this.props,
                this.options
            );

            if (typeof result === 'function') {
                return result.call(this, event, source, this);
            }

            return result;
        } catch {
            return undefined;
        }
    }

    /* ---------------- EVENTS ---------------- */

    protected on(
        el: EventTarget,
        evt: string,
        fn: EventListenerOrEventListenerObject,
        opts?: AddEventListenerOptions | boolean
    ): void {
        el.addEventListener(evt, fn, opts);
        this._handles.push([el, evt, fn, opts]);
    }

    protected offAll(): void {
        for (const [el, evt, fn, opts] of this._handles) {
            el.removeEventListener(evt, fn, opts);
        }
        this._handles.length = 0;
    }

    destroy(): void {
        this.offAll();
        this._propsListeners.clear();
        for (const fn of this._storeUnsubs) {
            fn();
        }
        this._storeUnsubs.length = 0;
        this._directiveEvents.clear();
        this._refs = {};
        this._refsProxy = undefined;
        this._propsProxy = undefined;
    }

    protected emit<T = unknown>(
        name: string,
        detail?: T,
        options: { cancelable?: boolean } = {}
    ): CustomEvent<T> {
        const evt = new CustomEvent<T>(name, {
            detail,
            bubbles: true,
            composed: true,
            cancelable: options.cancelable ?? false
        });
        this.el.dispatchEvent(evt);
        return evt;
    }
}
