export type EventHandle = [EventTarget, string, EventListenerOrEventListenerObject, AddEventListenerOptions | boolean | undefined];

export interface ComponentOptions {
    // wide open – each component can narrow this via generics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export class Component {
    protected el: HTMLElement;
    protected options: ComponentOptions;
    private _handles: EventHandle[] = [];

    constructor(el: HTMLElement, options: ComponentOptions = {}) {
        this.el = el;
        this.options = options;
    }

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
