// Core State Engine (Tiny Engine Native)

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
    private state: S;
    private reducer: CapsuleReducer<S>;
    private listeners = new Set<CapsuleListener<S>>();
    private middlewares = new Set<CapsuleMiddleware<S>>();

    constructor(reducer: CapsuleReducer<S>, initial: S) {
        this.reducer = reducer;
        this.state = structuredClone(initial);
    }

    snapshot(): S {
        return this.state;
    }

    send(action: CapsuleAction): void {
        const nextAction = this.runMiddlewares(action);
        if (!nextAction) {
            return;
        }

        const next = this.reducer(this.state, nextAction);

        if (next !== this.state) {
            this.state = next;
            for (const listener of this.listeners) {
                listener(this.state, nextAction);
            }
        }
    }

    connect(fn: CapsuleListener<S>): () => void {
        this.listeners.add(fn);
        fn(this.state, { type: '__INIT__' });
        return () => this.listeners.delete(fn);
    }

    use(middleware: CapsuleMiddleware<S>): () => void {
        this.middlewares.add(middleware);
        return () => this.middlewares.delete(middleware);
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
}
