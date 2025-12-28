export type EventHandle = [EventTarget, string, EventListenerOrEventListenerObject, AddEventListenerOptions | boolean | undefined];

export interface CapsuleOptions {
    // Capsule-specific props
    [key: string]: unknown;
}

// TODO: Start Version 1.2.0 NEW: Props
export interface PropsChangeListener {
    (newValue: unknown, oldValue: unknown, key: string): void;
}
// TODO: End
export class Capsule {
    protected el: HTMLElement;
    protected options: CapsuleOptions;
    private _handles: EventHandle[] = [];
    // TODO: Start Version 1.2.0
    private _propsListeners = new Map<string, PropsChangeListener[]>();
    private _refs: Record<string, HTMLElement> = {};
    // TODO: End
    constructor(el: HTMLElement, options: CapsuleOptions = {}) {
        this.el = el;
        this.options = { ...options };
        this._collectRefs(el); // Runs on EVERY instance
        this._processDirectives(); // Process directives on construction
    }

    // TODO: Version 1.2.0 NEW: Props reactive system
    get props() {
        return new Proxy(this.options, {
            set: (target, prop: string, value) => {
                const oldValue = target[prop];
                target[prop] = value;
                this._notifyPropsListeners(prop, value, oldValue);
                return true;
            }
        });
    }

    onPropChange(prop: string, listener: PropsChangeListener): void {
        if (!this._propsListeners.has(prop)) {
            this._propsListeners.set(prop, []);
        }
        this._propsListeners.get(prop)!.push(listener);
    }

    // NEW: refs access
    get refs(): Record<string, HTMLElement> {
        return this._refs;
    }

    private _notifyPropsListeners(prop: string, newValue: unknown, oldValue: unknown): void {
        const listeners = this._propsListeners.get(prop);
        if (listeners) {
            listeners.forEach(listener => listener(newValue, oldValue, prop));
        }
    }

    private _collectRefs(root: HTMLElement): void {
        // Local refs collection (runs on constructor)
        root.querySelectorAll('[ref]').forEach((el) => {
            const refName = (el as HTMLElement).getAttribute('ref');
            if (refName) {
                this._refs[refName] = el as HTMLElement;
            }
        });
    }

    private _processDirectives(): void {
        Object.entries(this.options).forEach(([key, value]) => {
            if (key.startsWith('@')) {
                const event = key.slice(1); // @click → click
                const expr = value as string;

                // ✅ Parse simple method calls: select('Home')
                const methodMatch = expr.match(/^(\w+)\((['"])([^'"]+)\2\)$/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    const argValue = methodMatch[3];

                    this.el.addEventListener(event, (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // ✅ Call global method with argument
                        const globalFn = (window as any)[methodName];
                        if (typeof globalFn === 'function') {
                            globalFn(argValue);
                            console.log(`🔥 Directive executed: ${expr}`);
                        }

                        // ✅ Emit directive event
                        this.emit('directive', { event, expr, value: argValue });
                    });
                } else if (expr.includes('++') || expr.includes('=')) {
                    this.el.addEventListener(event, () => {
                        (window as any).eval(expr); // Secure eval scope
                    });
                }
            }
        });
    }
    // TODO: End

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
        // TODO: Start Version 1.2.0 Clear props listeners
        this._propsListeners.clear();
        // TODO: End
    }

    protected emit<T = unknown>(
        name: string,
        detail?: T,
        options: { cancelable?: boolean } = {}
    ): CustomEvent<T> {
        const event = new CustomEvent<T>(name, {
            detail,
            bubbles: true,
            composed: true,
            cancelable: options.cancelable ?? false,
        });
        this.el.dispatchEvent(event);
        return event;
    }
}
