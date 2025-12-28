import { UI } from './core/engine';

export { UI } from './core/engine';
export type { ComponentOptions } from './core/base';
export { Component } from './core/base';
export type { EventHandle } from './core/base';
export { toCamel, parseVal, readOptions } from './core/utils';
export type { ComponentCtor } from './core/engine';
export { getPrefix } from './core/engine';
export type { UIOptions } from './core/engine';

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
