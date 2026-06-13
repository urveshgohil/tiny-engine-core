import { canUseDOM } from "../core/utils";
import { getDataGridColumnTitle, resolveDataGridColumns } from "./state";
import type {
    DataGridOptions,
    DataGridResolvedColumn,
    DataGridRow,
    DataGridState,
    PersistedDataGridState
} from "./types";

export function loadPersistedDataGridState<Row extends DataGridRow>(
    options: DataGridOptions<Row>
): Partial<PersistedDataGridState> | null {
    const key = getDataGridPersistKey(options);
    if (!key || !canUseDOM()) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as Partial<PersistedDataGridState>;
    } catch {
        return null;
    }
}

export function savePersistedDataGridState<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    state: PersistedDataGridState
): void {
    const key = getDataGridPersistKey(options);
    if (!key || !canUseDOM()) {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
        return;
    }
}

export function getDataGridPersistKey<Row extends DataGridRow>(
    options: DataGridOptions<Row>
): string | null {
    if (!options.persist) {
        return null;
    }

    return options.persistKey || "tiny-engine-data-grid";
}

export function getExportColumns<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    state: Pick<DataGridState, "visibleColumns" | "columnOrder">
): DataGridResolvedColumn<Row>[] {
    const columns = resolveDataGridColumns(options.columns, state);
    if (options.includeHiddenColumnsInExport) {
        return columns;
    }

    return columns.filter((column) => column.visible);
}

export function getColumnLabel<Row extends DataGridRow>(
    column: DataGridResolvedColumn<Row>,
    index = 0
): string {
    return column.title || getDataGridColumnTitle(column, index);
}
