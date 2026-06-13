import type { CapsuleOptions } from "../core/base";

export type DataGridRow = object;
export type DataGridRowKey = string | number;
export type DataGridSortDirection = "asc" | "desc";
export type DataGridSelectionMode = "none" | "single" | "multiple";

export interface DataGridCellContext<Row extends DataGridRow> {
    row: Row;
    rowIndex: number;
    column: DataGridResolvedColumn<Row>;
    value: unknown;
}

export interface DataGridColumn<Row extends DataGridRow = DataGridRow> {
    field?: string;
    id?: string;
    title?: string;
    header?: string;
    accessor?: keyof Row | ((row: Row) => unknown);
    sortable?: boolean;
    filterable?: boolean;
    align?: "start" | "center" | "end";
    width?: string;
    hidden?: boolean;
    sticky?: boolean;
    format?: (context: DataGridCellContext<Row>) => unknown;
    render?: (
        value: unknown,
        row: Row,
        column: DataGridResolvedColumn<Row>,
        rowIndex: number
    ) => unknown;
    compare?: (left: Row, right: Row) => number;
}

export interface DataGridResolvedColumn<Row extends DataGridRow = DataGridRow>
    extends DataGridColumn<Row> {
    field: string;
    title: string;
    visible: boolean;
}

export interface DataGridSort {
    columnId: string;
    direction: DataGridSortDirection;
}

export interface DataGridOptions<Row extends DataGridRow = DataGridRow> extends CapsuleOptions {
    columns: DataGridColumn<Row>[];
    rows: Row[];
    rowKey?: keyof Row | ((row: Row, index: number) => DataGridRowKey);
    sort?: DataGridSort | null;
    search?: string;
    searchable?: boolean;
    pagination?: boolean;
    page?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    selection?: DataGridSelectionMode;
    selectedKeys?: DataGridRowKey[];
    emptyText?: string;
    emptyState?: string;
    ariaLabel?: string;
    stickyHeader?: boolean;
    loading?: boolean;
    persist?: boolean;
    persistKey?: string;
    urlSync?: boolean;
    includeHiddenColumnsInExport?: boolean;
}

export interface DataGridState {
    sort: DataGridSort | null;
    search: string;
    page: number;
    pageSize: number;
    selectedKeys: Set<DataGridRowKey>;
    visibleColumns: Set<string>;
    columnOrder: string[];
    loading: boolean;
}

export interface DataGridIndexedRow<Row extends DataGridRow = DataGridRow> {
    row: Row;
    sourceIndex: number;
    key: DataGridRowKey;
}

export interface DataGridView<Row extends DataGridRow = DataGridRow> {
    columns: DataGridResolvedColumn<Row>[];
    allColumns: DataGridResolvedColumn<Row>[];
    rows: DataGridIndexedRow<Row>[];
    filteredRows: DataGridIndexedRow<Row>[];
    totalRows: number;
    filteredCount: number;
    page: number;
    pageSize: number;
    pageCount: number;
    start: number;
    end: number;
    sort: DataGridSort | null;
    search: string;
    loading: boolean;
}

export interface DataGridChangeDetail<Row extends DataGridRow = DataGridRow> {
    view: DataGridView<Row>;
    selectedKeys: DataGridRowKey[];
    selectedRows: Row[];
}

export interface DataGridRowClickDetail<Row extends DataGridRow = DataGridRow> {
    key: DataGridRowKey;
    row: Row;
    rowIndex: number;
    originalEvent: Event;
}

export interface DataGridSelectionDetail<Row extends DataGridRow = DataGridRow> {
    key?: DataGridRowKey;
    row?: Row;
    rowIndex?: number;
    selectedKeys: DataGridRowKey[];
    selectedRows: Row[];
}

export interface DataGridColumnVisibilityDetail {
    field: string;
    visible: boolean;
    visibleColumns: string[];
}

export interface DataGridColumnReorderDetail {
    fromIndex?: number;
    toIndex?: number;
    columnOrder: string[];
}

export interface DataGridPageDetail {
    page: number;
    pageSize: number;
    pageCount: number;
}

export interface DataGridActionDetail<Row extends DataGridRow = DataGridRow> {
    action: string;
    key: DataGridRowKey;
    row: Row;
    rowIndex: number;
    column: DataGridResolvedColumn<Row>;
    trigger: HTMLElement;
    originalEvent: Event;
}

export interface DataGridEventMap<Row extends DataGridRow = DataGridRow> {
    "row:click": DataGridRowClickDetail<Row>;
    "row:select": DataGridSelectionDetail<Row>;
    "column:visibility": DataGridColumnVisibilityDetail;
    "column:reorder": DataGridColumnReorderDetail;
    sort: { sort: DataGridSort | null };
    search: { search: string };
    "page:change": DataGridPageDetail;
    action: DataGridActionDetail<Row>;
}

export type DataGridEventName = keyof DataGridEventMap;

export interface DataGridPluginOptions {
    name?: string;
}

export interface PersistedDataGridState {
    sort: DataGridSort | null;
    search: string;
    page: number;
    pageSize: number;
    selectedKeys: DataGridRowKey[];
    visibleColumns: string[];
    columnOrder: string[];
}
