import { Capsule, CapsuleOptions } from './base';
import { readOptions } from './utils';

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
    prefix?: string;
}

let prefix = 'ui';

export function getPrefix() {
    return prefix;
}

export const UI = (() => {
    const registry: Registry = {};
    let observing = false;

    const config = (options: UIOptions = {}) => {
        if (options.prefix) {
            prefix = options.prefix;
        }
    };

    function register(name: string, Ctor: CapsuleCtor): void {
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
        const matches: HTMLElement[] = [];

        if (root instanceof HTMLElement && root.matches(selector)) {
            matches.push(root);
        }

        if ('querySelectorAll' in root) {
            root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
                matches.push(el);
            });
        }

        return matches;
    }

    function init(root: ParentNode = document): void {
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

        [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))]
            .forEach((el) => {
                Object.keys(el.__ui || {}).forEach((name) => destroyInstance(el, name));
            });
    }

    function refreshOwners(node: Node): void {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const owners = new Set<Capsule>();
        let current: HTMLElement | null = node;

        while (current) {
            Object.values(current.__ui || {}).forEach((instance) => owners.add(instance));
            current = current.parentElement;
        }

        owners.forEach((instance) => instance.refresh(node));
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
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        init(node);
                        refreshOwners(node);
                    }
                });

                mutation.removedNodes.forEach((node) => destroyTree(node));
            }

            if (
                mutation.type === 'attributes' &&
                mutation.target instanceof HTMLElement &&
                mutation.attributeName
            ) {
                syncAttributeChange(mutation.target, mutation.attributeName);
            }
        });
    });

    function observe(): void {
        if (observing) {
            return;
        }

        observing = true;
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
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
