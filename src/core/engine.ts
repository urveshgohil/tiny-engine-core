import { Component, ComponentOptions } from './base';
import { readOptions } from './utils';

export interface ComponentCtor<
    T extends Component = Component,
    O extends ComponentOptions = ComponentOptions
> {
    selector?: string;
    defaults?: Partial<O>;
    new(el: HTMLElement, options: O): T;
}

type Registry = Record<string, ComponentCtor>;
type InstanceMap = Record<string, Component>;

declare global {
    interface HTMLElement {
        __ui?: InstanceMap;
    }
}

export interface UIOptions {
    /** Custom attribute prefix (default: 'ui') */
    prefix?: string;
}

let prefix: string = 'ui'; // Default prefix

export function getPrefix() { return prefix; }

export const UI = (() => {

    // Config API
    const config = (options: UIOptions = {}) => {
        if (options.prefix) prefix = options.prefix;
    };

    const registry: Registry = {};

    function register(name: string, Ctor: ComponentCtor): void {
        Ctor.selector = name;
        registry[name] = Ctor;
    }

    function getOrCreate<T extends Component = Component>(
        el: HTMLElement,
        name: string,
        options?: ComponentOptions
    ): T | null {
        const Ctor = registry[name] as ComponentCtor<T> | undefined;
        if (!Ctor) return null;

        if (!el.__ui) el.__ui = {};
        if (!el.__ui[name]) {
            const opts: ComponentOptions = Object.assign(
                {},
                Ctor.defaults || {},
                readOptions(el, name),
                options || {}
            );
            el.__ui[name] = new Ctor(el, opts as never);
        }

        return el.__ui[name] as T;
    }

    function init(root: ParentNode = document): void {
        for (const name of Object.keys(registry)) {
            root
                .querySelectorAll<HTMLElement>(`[${prefix}-${name}]`)
                .forEach((el) => getOrCreate(el, name));
        }
    }

    const observer = new MutationObserver((muts) => {
        for (const m of muts) {
            m.addedNodes.forEach((n) => {
                if (n?.nodeType === 1) {
                    init(n as Element);
                }
            });
        }
    });

    function observe(): void {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    return {
        config,
        register,
        init,
        observe,
        getOrCreate,
        getPrefix
    };
})();
