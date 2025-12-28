import { Capsule, CapsuleOptions } from './base';
import { readOptions, collectDirectives, collectRefs } from './utils';

export interface CapsuleCtor<
    T extends Capsule = Capsule,
    O extends CapsuleOptions = CapsuleOptions
> {
    selector?: string;
    defaults?: Partial<O>;
    new(el: HTMLElement, options: O): T;
}

type Registry = Record<string, CapsuleCtor>;
type InstanceMap = Record<string, Capsule>;

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
    const config = (options: UIOptions = {}) => {
        if (options.prefix) prefix = options.prefix;
    };

    const registry: Registry = {};

    function register(name: string, Ctor: CapsuleCtor): void {
        Ctor.selector = name;
        registry[name] = Ctor;
    }

    function getOrCreate<T extends Capsule = Capsule>(
        el: HTMLElement,
        name: string,
        options?: CapsuleOptions
    ): T | null {
        const Ctor = registry[name] as CapsuleCtor<T> | undefined;
        if (!Ctor) return null;

        if (!el.__ui) el.__ui = {};
        if (!el.__ui[name]) {
            // ✅ Enhanced options merging
            const opts: CapsuleOptions = Object.assign(
                {},
                Ctor.defaults || {},           // 1. Capsule defaults
                readOptions(el, name, prefix), // 2. HTML attributes
                collectDirectives(el, prefix), // 3. Directives become options.@click
                options || {}                  // 4. Manual options
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
