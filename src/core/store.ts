// Core State Engine (Tiny Engine Native)

export type CapsuleAction<T = any> = {
    type: string;
    payload?: T;
};

export type CapsuleReducer<S> = (state: S, action: CapsuleAction) => S;
export type CapsuleListener<S> = (state: S, action: CapsuleAction) => void;

export class CapsuleStore<S extends object> {
    private state: S;
    private reducer: CapsuleReducer<S>;
    private listeners = new Set<CapsuleListener<S>>();

    constructor(reducer: CapsuleReducer<S>, initial: S) {
        this.reducer = reducer;
        this.state = structuredClone(initial);
    }

    snapshot(): S {
        return this.state;
    }

    send(action: CapsuleAction): void {
        const next = this.reducer(this.state, action);

        if (next !== this.state) {
            this.state = next;
            this.listeners.forEach(fn => fn(this.state, action));
        }
    }

    connect(fn: CapsuleListener<S>): () => void {
        this.listeners.add(fn);
        fn(this.state, { type: '__INIT__' });
        return () => this.listeners.delete(fn);
    }
}
