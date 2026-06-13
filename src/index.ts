import { UI } from './core/engine';

export { Capsule } from './core/base';
export { CapsuleStore } from './core/store';
export { request, TinyRequest, TinyRequestError } from './core/request';
export { generateUID, resetUID } from './core/uid';

export {
    toCamel,
    parseVal,
    readOptions,
    getDataTarget,
    getDataAction,
    invokeAction,
    collectDirectives,
    collectRefs,
    canUseDOM,
    getDevtoolsBridge,
    getDevtoolsSnapshot
} from './core/utils';

export { UI, getPrefix } from './core/engine';
export * from './data-grid';

export type {
    EventHandle,
    CapsuleOptions,
    PropsChangeListener
} from './core/base';

export type {
    UIOptions,
    CapsuleCtor,
    CapsuleFn,
    CapsuleDefinition,
    FunctionalCapsuleApi,
    FunctionalCapsuleHooks,
    UIPlugin,
    UIPluginObject,
    UIPluginInstaller,
    UIPluginContext,
    UIPluginHookName,
    UIPluginHookHandler,
    UIPluginHookPayloadMap
} from './core/engine';

export type {
    CapsuleAction,
    CapsuleReducer,
    CapsuleListener,
    CapsuleMiddleware
} from './core/store';

export type {
    CapsuleInspection
} from './core/base';

export type {
    TinyErrorInterceptor,
    TinyRequestContext,
    TinyRequestDefaults,
    TinyRequestInterceptor,
    TinyRequestMethod,
    TinyRequestOptions,
    TinyResponseInterceptor,
    TinyUploadOptions
} from './core/request';

export type {
    TinyEngineRuntimeConfig,
    TinyEngineRegistrySnapshot,
    TinyEnginePluginSnapshot,
    TinyEngineCapsuleSnapshot,
    TinyEngineStoreSnapshot,
    TinyEnginePerformanceMetrics,
    TinyEngineWarningSnapshot,
    TinyEngineEventSnapshot,
    TinyEngineDevtoolsSnapshot,
    TinyEngineDevtoolsBridge
} from './core/utils';

// Script tag auto-setup (optional)
declare global {
    interface Window {
        UI?: typeof UI;
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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
