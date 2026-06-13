import type {
    DataGridColumn,
    DataGridOptions,
    DataGridResolvedColumn,
    DataGridRow,
    DataGridSort,
    DataGridState,
    PersistedDataGridState
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

export function getDataGridColumnField<Row extends DataGridRow>(
    column: DataGridColumn<Row>,
    index = 0
): string {
    return column.field || column.id || `column-${index}`;
}

export function getDataGridColumnTitle<Row extends DataGridRow>(
    column: DataGridColumn<Row>,
    index = 0
): string {
    return column.title || column.header || getDataGridColumnField(column, index);
}

export function normalizeColumnOrder<Row extends DataGridRow>(
    columns: readonly DataGridColumn<Row>[],
    order?: readonly string[]
): string[] {
    const fields = columns.map((column, index) => getDataGridColumnField(column, index));
    const seen = new Set<string>();
    const nextOrder: string[] = [];

    for (const field of order ?? []) {
        if (!fields.includes(field) || seen.has(field)) {
            continue;
        }
        seen.add(field);
        nextOrder.push(field);
    }

    for (const field of fields) {
        if (!seen.has(field)) {
            nextOrder.push(field);
        }
    }

    return nextOrder;
}

export function normalizeVisibleColumns<Row extends DataGridRow>(
    columns: readonly DataGridColumn<Row>[],
    visibleColumns?: Iterable<string>
): Set<string> {
    const fields = columns.map((column, index) => getDataGridColumnField(column, index));
    const nextVisible = new Set<string>();

    if (visibleColumns) {
        for (const field of visibleColumns) {
            if (fields.includes(field)) {
                nextVisible.add(field);
            }
        }
    } else {
        columns.forEach((column, index) => {
            if (column.hidden !== true) {
                nextVisible.add(getDataGridColumnField(column, index));
            }
        });
    }

    return nextVisible;
}

export function resolveDataGridColumns<Row extends DataGridRow>(
    columns: readonly DataGridColumn<Row>[],
    state: Pick<DataGridState, "visibleColumns" | "columnOrder">
): DataGridResolvedColumn<Row>[] {
    const columnMap = new Map(
        columns.map((column, index) => {
            const field = getDataGridColumnField(column, index);
            return [field, {
                ...column,
                field,
                id: field,
                title: getDataGridColumnTitle(column, index),
                header: getDataGridColumnTitle(column, index),
                visible: state.visibleColumns.has(field)
            } as DataGridResolvedColumn<Row>];
        })
    );

    return normalizeColumnOrder(columns, state.columnOrder)
        .map((field) => columnMap.get(field))
        .filter((column): column is DataGridResolvedColumn<Row> => Boolean(column));
}

export function resolveVisibleColumns<Row extends DataGridRow>(
    columns: readonly DataGridColumn<Row>[],
    state: Pick<DataGridState, "visibleColumns" | "columnOrder">
): DataGridResolvedColumn<Row>[] {
    return resolveDataGridColumns(columns, state).filter((column) => column.visible);
}

export function normalizeSort<Row extends DataGridRow>(
    sort: DataGridSort | null | undefined,
    columns: readonly DataGridColumn<Row>[]
): DataGridSort | null {
    if (!sort) {
        return null;
    }

    const resolved = resolveDataGridColumns(columns, {
        visibleColumns: normalizeVisibleColumns(columns),
        columnOrder: normalizeColumnOrder(columns)
    });
    return resolved.some((column) => column.field === sort.columnId)
        ? sort
        : null;
}

export function createDataGridState<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    current?: DataGridState,
    persisted?: Partial<PersistedDataGridState>,
    urlState?: Partial<Pick<DataGridState, "search" | "page" | "pageSize" | "sort">>
): DataGridState {
    const columnOrder = normalizeColumnOrder(
        options.columns,
        options.columns.length > 0
            ? options.columns.map((column, index) => getDataGridColumnField(column, index))
            : current?.columnOrder
    );
    const visibleColumns = normalizeVisibleColumns(
        options.columns,
        options.columns.length > 0
            ? options.columns
                .map((column, index) => ({
                    field: getDataGridColumnField(column, index),
                    hidden: column.hidden
                }))
                .filter((column) => column.hidden !== true)
                .map((column) => column.field)
            : current?.visibleColumns
    );

    const mergedOrder = normalizeColumnOrder(
        options.columns,
        persisted?.columnOrder ?? current?.columnOrder ?? columnOrder
    );
    const mergedVisible = normalizeVisibleColumns(
        options.columns,
        persisted?.visibleColumns ?? current?.visibleColumns ?? visibleColumns
    );

    return {
        sort: normalizeSort(
            options.sort
                ?? urlState?.sort
                ?? persisted?.sort
                ?? current?.sort
                ?? null,
            options.columns
        ),
        search: String(
            options.search
                ?? urlState?.search
                ?? persisted?.search
                ?? current?.search
                ?? ""
        ),
        page: normalizePositiveInt(
            options.page
                ?? urlState?.page
                ?? persisted?.page
                ?? current?.page
                ?? 1,
            1
        ),
        pageSize: normalizePositiveInt(
            options.pageSize
                ?? urlState?.pageSize
                ?? persisted?.pageSize
                ?? current?.pageSize
                ?? DEFAULT_PAGE_SIZE,
            DEFAULT_PAGE_SIZE
        ),
        selectedKeys: new Set(
            options.selectedKeys
                ?? persisted?.selectedKeys
                ?? current?.selectedKeys
                ?? []
        ),
        visibleColumns: mergedVisible,
        columnOrder: mergedOrder,
        loading: Boolean(options.loading ?? current?.loading ?? false)
    };
}

export function toPersistedDataGridState(state: DataGridState): PersistedDataGridState {
    return {
        sort: state.sort,
        search: state.search,
        page: state.page,
        pageSize: state.pageSize,
        selectedKeys: [...state.selectedKeys],
        visibleColumns: [...state.visibleColumns],
        columnOrder: [...state.columnOrder]
    };
}

export function normalizePositiveInt(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 1) {
        return fallback;
    }

    return Math.floor(numeric);
}
