import { UI } from './core/engine';

export { Capsule } from './core/base';
export { CapsuleStore } from './core/store';
export { generateUID, resetUID } from './core/uid';

export {
    toCamel,
    parseVal,
    readOptions,
    collectDirectives,
    collectRefs
} from './core/utils';

export { UI, getPrefix } from './core/engine';

export type {
    EventHandle,
    CapsuleOptions,
    PropsChangeListener
} from './core/base';

export type {
    UIOptions,
    CapsuleCtor
} from './core/engine';

// Script tag auto-setup (optional)
declare global {
    interface Window {
        UI?: typeof UI;
    }
}

if (typeof window !== 'undefined') {
    (window as any).UI = UI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            UI.init();
            UI.observe();
        });
    } else {
        UI.init();
        UI.observe();
    }
}
