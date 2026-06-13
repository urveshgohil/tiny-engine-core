import { resolveDataGridColumns, resolveVisibleColumns } from "./state";
import type {
    DataGridColumn,
    DataGridIndexedRow,
    DataGridOptions,
    DataGridResolvedColumn,
    DataGridRow,
    DataGridRowKey,
    DataGridSort,
    DataGridState,
    DataGridView
} from "./types";

export function getDataGridCellValue<Row extends DataGridRow>(
    row: Row,
    column: Pick<DataGridColumn<Row>, "field" | "id" | "accessor">
): unknown {
    if (typeof column.accessor === "function") {
        return column.accessor(row);
    }

    const key = column.accessor ?? column.field ?? column.id;
    return key == null
        ? undefined
        : (row as Record<PropertyKey, unknown>)[key as PropertyKey];
}

export function getDataGridRowKey<Row extends DataGridRow>(
    row: Row,
    index: number,
    rowKey: DataGridOptions<Row>["rowKey"]
): DataGridRowKey {
    const value = typeof rowKey === "function"
        ? rowKey(row, index)
        : rowKey
            ? (row as Record<PropertyKey, unknown>)[rowKey as PropertyKey]
            : index;

    return typeof value === "string" || typeof value === "number" ? value : index;
}

export function createIndexedRows<Row extends DataGridRow>(
    rows: readonly Row[],
    rowKey: DataGridOptions<Row>["rowKey"]
): DataGridIndexedRow<Row>[] {
    return rows.map((row, sourceIndex) => ({
        row,
        sourceIndex,
        key: getDataGridRowKey(row, sourceIndex, rowKey)
    }));
}

export function filterDataGridRows<Row extends DataGridRow>(
    rows: readonly DataGridIndexedRow<Row>[],
    columns: readonly DataGridResolvedColumn<Row>[],
    search: string
): DataGridIndexedRow<Row>[] {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
        return [...rows];
    }

    const searchableColumns = columns.filter((column) => column.filterable !== false);
    return rows.filter(({ row }) => searchableColumns.some((column) =>
        String(getDataGridCellValue(row, column) ?? "")
            .toLocaleLowerCase()
            .includes(query)
    ));
}

export function sortDataGridRows<Row extends DataGridRow>(
    rows: readonly DataGridIndexedRow<Row>[],
    columns: readonly DataGridResolvedColumn<Row>[],
    sort: DataGridSort | null
): DataGridIndexedRow<Row>[] {
    if (!sort) {
        return [...rows];
    }

    const column = columns.find(({ field }) => field === sort.columnId);
    if (!column || column.sortable === false) {
        return [...rows];
    }

    const direction = sort.direction === "desc" ? -1 : 1;
    return [...rows].sort((left, right) => {
        const result = column.compare
            ? column.compare(left.row, right.row)
            : compareDataGridValues(
                getDataGridCellValue(left.row, column),
                getDataGridCellValue(right.row, column)
            );

        return result === 0 ? left.sourceIndex - right.sourceIndex : result * direction;
    });
}

export function createDataGridView<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    state: Pick<DataGridState, "sort" | "search" | "page" | "pageSize" | "visibleColumns" | "columnOrder" | "loading">
): DataGridView<Row> {
    const allColumns = resolveDataGridColumns(options.columns, state);
    const columns = resolveVisibleColumns(options.columns, state);
    const indexedRows = createIndexedRows(options.rows, options.rowKey);
    const filteredRows = filterDataGridRows(indexedRows, allColumns, state.search);
    const sortedRows = sortDataGridRows(filteredRows, allColumns, state.sort);
    const pageSize = Math.max(1, state.pageSize);
    const pageCount = options.pagination
        ? Math.max(1, Math.ceil(sortedRows.length / pageSize))
        : 1;
    const page = options.pagination
        ? Math.min(Math.max(1, state.page), pageCount)
        : 1;
    const startIndex = options.pagination ? (page - 1) * pageSize : 0;
    const rows = options.pagination
        ? sortedRows.slice(startIndex, startIndex + pageSize)
        : sortedRows;

    return {
        columns,
        allColumns,
        rows,
        filteredRows: sortedRows,
        totalRows: indexedRows.length,
        filteredCount: sortedRows.length,
        page,
        pageSize,
        pageCount,
        start: sortedRows.length === 0 ? 0 : startIndex + 1,
        end: startIndex + rows.length,
        sort: state.sort,
        search: state.search,
        loading: state.loading
    };
}

function compareDataGridValues(left: unknown, right: unknown): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === "number" && typeof right === "number") return left - right;
    if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime();

    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base"
    });
}
