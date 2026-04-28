import { generateUID } from './uid';
import {
    pushDevtoolsEvent,
    registerStoreSnapshot,
    unregisterStoreSnapshot
} from './utils';

export type CapsuleAction<T = any> = {
    type: string;
    payload?: T;
};

export type CapsuleReducer<S> = (state: S, action: CapsuleAction) => S;
export type CapsuleListener<S> = (state: S, action: CapsuleAction) => void;
export type CapsuleMiddleware<S> = (
    action: CapsuleAction,
    state: S
) => void | CapsuleAction | false;

export class CapsuleStore<S extends object> {
    private readonly id: string;
    private state: S;
    private reducer: CapsuleReducer<S>;
    private listeners = new Set<CapsuleListener<S>>();
    private middlewares = new Set<CapsuleMiddleware<S>>();

    constructor(reducer: CapsuleReducer<S>, initial: S) {
        this.id = generateUID('store');
        this.reducer = reducer;
        this.state = structuredClone(initial);
        this.syncDevtools();
    }

    snapshot(): S {
        return this.state;
    }

    inspect(): { id: string; state: S; listeners: number; middlewares: number } {
        return {
            id: this.id,
            state: this.state,
            listeners: this.listeners.size,
            middlewares: this.middlewares.size
        };
    }

    send(action: CapsuleAction): void {
        const nextAction = this.runMiddlewares(action);
        if (!nextAction) {
            pushDevtoolsEvent('store:action-cancelled', {
                storeId: this.id,
                action
            });
            return;
        }

        const next = this.reducer(this.state, nextAction);

        if (next !== this.state) {
            this.state = next;
            this.syncDevtools();
            pushDevtoolsEvent('store:action', {
                storeId: this.id,
                action: nextAction,
                state: this.state
            });
            for (const listener of this.listeners) {
                listener(this.state, nextAction);
            }
        }
    }

    connect(fn: CapsuleListener<S>): () => void {
        this.listeners.add(fn);
        this.syncDevtools();
        fn(this.state, { type: '__INIT__' });
        return () => {
            this.listeners.delete(fn);
            this.syncDevtools();
        };
    }

    use(middleware: CapsuleMiddleware<S>): () => void {
        this.middlewares.add(middleware);
        this.syncDevtools();
        return () => {
            this.middlewares.delete(middleware);
            this.syncDevtools();
        };
    }

    destroy(): void {
        this.listeners.clear();
        this.middlewares.clear();
        unregisterStoreSnapshot(this.id);
        pushDevtoolsEvent('store:destroy', {
            storeId: this.id
        });
    }

    private runMiddlewares(action: CapsuleAction): CapsuleAction | null {
        if (this.middlewares.size === 0) {
            return action;
        }

        let nextAction: CapsuleAction | null = action;

        for (const middleware of this.middlewares) {
            if (!nextAction) {
                break;
            }

            const result = middleware(nextAction, this.state);

            if (result === false) {
                return null;
            }

            if (result && typeof result === 'object' && typeof result.type === 'string') {
                nextAction = result;
            }
        }

        return nextAction;
    }

    private syncDevtools(): void {
        registerStoreSnapshot({
            id: this.id,
            state: this.state,
            listeners: this.listeners.size,
            middlewares: this.middlewares.size
        });
    }
}
