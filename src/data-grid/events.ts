import type { DataGridEventMap, DataGridEventName, DataGridRow } from "./types";

type DataGridEventHandler<Row extends DataGridRow, K extends DataGridEventName> = (
    detail: DataGridEventMap<Row>[K]
) => void;

export class DataGridEventBus<Row extends DataGridRow = DataGridRow> {
    private handlers = new Map<DataGridEventName, Set<(detail: unknown) => void>>();

    on<K extends DataGridEventName>(
        eventName: K,
        handler: DataGridEventHandler<Row, K>
    ): () => void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }

        const bucket = this.handlers.get(eventName)!;
        const wrapped = handler as unknown as (detail: unknown) => void;
        bucket.add(wrapped);

        return () => {
            bucket.delete(wrapped);
            if (bucket.size === 0) {
                this.handlers.delete(eventName);
            }
        };
    }

    emit<K extends DataGridEventName>(
        eventName: K,
        detail: DataGridEventMap<Row>[K]
    ): void {
        for (const handler of this.handlers.get(eventName) ?? []) {
            handler(detail);
        }
    }

    clear(): void {
        this.handlers.clear();
    }
}
