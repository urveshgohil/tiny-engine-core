import { Capsule } from "../core/base";
import type { CapsuleOptions } from "../core/base";
import { canUseDOM } from "../core/utils";
import { exportDataGridCSV } from "./csv";
import { DataGridEventBus } from "./events";
import { loadPersistedDataGridState, savePersistedDataGridState } from "./persistence";
import { createDataGridView, getDataGridRowKey } from "./query";
import { renderDataGrid } from "./render";
import {
    createDataGridState,
    normalizeColumnOrder,
    normalizeVisibleColumns,
    resolveVisibleColumns
} from "./state";
import { loadUrlDataGridState, syncUrlDataGridState } from "./url-sync";
import type {
    DataGridActionDetail,
    DataGridChangeDetail,
    DataGridColumn,
    DataGridEventMap,
    DataGridEventName,
    DataGridOptions,
    DataGridResolvedColumn,
    DataGridRow,
    DataGridRowClickDetail,
    DataGridRowKey,
    DataGridSelectionDetail,
    DataGridSortDirection,
    DataGridState,
    DataGridView
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

export class DataGrid<Row extends DataGridRow = DataGridRow> extends Capsule {
    static defaults: Partial<DataGridOptions> = {
        columns: [],
        rows: [],
        sort: null,
        search: "",
        searchable: false,
        pagination: true,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        pageSizeOptions: [10, 25, 50],
        selection: "none",
        selectedKeys: [],
        emptyText: "No rows found",
        emptyState: "No rows found",
        stickyHeader: false,
        loading: false,
        persist: false,
        urlSync: false,
        includeHiddenColumnsInExport: false,
        ariaLabel: "Data grid"
    };

    private state: DataGridState;
    private view: DataGridView<Row>;
    private searchQueued = false;
    private events = new DataGridEventBus<Row>();

    constructor(el: HTMLElement, options: CapsuleOptions) {
        super(el, options);
        const gridOptions = options as DataGridOptions<Row>;
        this.state = createDataGridState(
            gridOptions,
            undefined,
            loadPersistedDataGridState(gridOptions) ?? undefined,
            loadUrlDataGridState(gridOptions) ?? undefined
        );
        this.view = createDataGridView(gridOptions, this.state);
        this.bindEvents();
        this.syncSideEffects();
        this.render();
    }

    override on(
        target: EventTarget | DataGridEventName,
        eventName: string | ((detail: unknown) => void),
        handler?: EventListenerOrEventListenerObject | ((detail: unknown) => void),
        options?: AddEventListenerOptions | boolean
    ): (() => void) | void {
        if (typeof target === "string" && typeof eventName === "function" && handler === undefined) {
            return this.events.on(target as DataGridEventName, eventName as never);
        }

        return super.on(
            target as EventTarget,
            eventName as string,
            handler as EventListenerOrEventListenerObject,
            options
        );
    }

    setRows(rows: Row[]): void {
        this.options.rows = rows;
        this.state.page = 1;
        this.pruneSelection();
        this.update("rows");
    }

    setColumns(columns: DataGridColumn<Row>[]): void {
        this.options.columns = columns;
        this.state.columnOrder = normalizeColumnOrder(columns, this.state.columnOrder);
        this.state.visibleColumns = normalizeVisibleColumns(columns, this.state.visibleColumns);
        if (this.state.sort && !columns.some((column, index) => {
            const field = column.field || column.id || `column-${index}`;
            return field === this.state.sort?.columnId;
        })) {
            this.state.sort = null;
        }
        this.update("columns");
    }

    setSearch(search: string): void {
        this.state.search = search;
        this.state.page = 1;
        this.update("search");
        this.emitGridEvent("search", { search });
        this.emit("data-grid:search", { search });
    }

    sortBy(columnId: string, direction?: DataGridSortDirection | null): void {
        const column = this.view.allColumns.find(({ field }) => field === columnId);
        if (!column || column.sortable === false) {
            return;
        }

        const current = this.state.sort;
        const nextDirection = direction === undefined
            ? current?.columnId === columnId && current.direction === "asc"
                ? "desc"
                : "asc"
            : direction;

        this.state.sort = nextDirection ? { columnId, direction: nextDirection } : null;
        this.state.page = 1;
        this.update("sort");
        this.emitGridEvent("sort", { sort: this.state.sort });
        this.emit("data-grid:sort", { sort: this.state.sort });
    }

    setPage(page: number): void {
        const nextPage = Math.min(Math.max(1, page), this.view.pageCount);
        if (nextPage === this.state.page) {
            return;
        }

        this.state.page = nextPage;
        this.update("page");
        this.emitPageChange();
    }

    setPageSize(pageSize: number): void {
        if (!Number.isFinite(pageSize) || pageSize < 1) {
            return;
        }

        this.state.pageSize = Math.floor(pageSize);
        this.state.page = 1;
        this.update("page-size");
        this.emitPageChange();
    }

    nextPage(): void {
        this.setPage(this.view.page + 1);
    }

    previousPage(): void {
        this.setPage(this.view.page - 1);
    }

    selectRow(key: DataGridRowKey, selected = true): void {
        const mode = this.gridOptions.selection ?? "none";
        if (mode === "none") {
            return;
        }
        if (mode === "single") {
            this.state.selectedKeys.clear();
        }

        if (selected) {
            this.state.selectedKeys.add(key);
        } else {
            this.state.selectedKeys.delete(key);
        }

        this.updateSelection("selection", key);
    }

    clearSelection(): void {
        if (this.state.selectedKeys.size === 0) {
            return;
        }
        this.state.selectedKeys.clear();
        this.updateSelection("selection");
    }

    selectCurrentPage(selected = true): void {
        if ((this.gridOptions.selection ?? "none") !== "multiple") {
            return;
        }

        for (const entry of this.view.rows) {
            if (selected) {
                this.state.selectedKeys.add(entry.key);
            } else {
                this.state.selectedKeys.delete(entry.key);
            }
        }
        this.updateSelection("selection-page");
    }

    showColumn(field: string): void {
        if (this.state.visibleColumns.has(field)) {
            return;
        }
        this.state.visibleColumns.add(field);
        this.update("column-visibility");
        this.emitGridEvent("column:visibility", {
            field,
            visible: true,
            visibleColumns: this.getVisibleColumns()
        });
    }

    hideColumn(field: string): void {
        if (!this.state.visibleColumns.has(field)) {
            return;
        }
        this.state.visibleColumns.delete(field);
        this.update("column-visibility");
        this.emitGridEvent("column:visibility", {
            field,
            visible: false,
            visibleColumns: this.getVisibleColumns()
        });
    }

    toggleColumn(field: string): void {
        if (this.state.visibleColumns.has(field)) {
            this.hideColumn(field);
            return;
        }
        this.showColumn(field);
    }

    getVisibleColumns(): string[] {
        return resolveVisibleColumns(this.gridOptions.columns, this.state).map((column) => column.field);
    }

    moveColumn(fromIndex: number, toIndex: number): void {
        const order = [...this.state.columnOrder];
        if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= order.length ||
            toIndex >= order.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        const [field] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, field);
        this.state.columnOrder = order;
        this.update("column-order");
        this.emitGridEvent("column:reorder", {
            fromIndex,
            toIndex,
            columnOrder: this.getColumnOrder()
        });
    }

    setColumnOrder(fields: string[]): void {
        this.state.columnOrder = normalizeColumnOrder(this.gridOptions.columns, fields);
        this.update("column-order");
        this.emitGridEvent("column:reorder", {
            columnOrder: this.getColumnOrder()
        });
    }

    getColumnOrder(): string[] {
        return [...this.state.columnOrder];
    }

    loading(next?: boolean): boolean | void {
        if (typeof next === "undefined") {
            return this.state.loading;
        }

        const value = Boolean(next);
        if (value === this.state.loading) {
            return;
        }

        this.state.loading = value;
        this.update("loading");
    }

    exportCSV(filename?: string): string {
        return exportDataGridCSV(this.gridOptions, this.state, this.view, filename);
    }

    getSelectedKeys(): DataGridRowKey[] {
        return [...this.state.selectedKeys];
    }

    getSelectedRows(): Row[] {
        return this.gridOptions.rows.filter((row, index) =>
            this.state.selectedKeys.has(
                getDataGridRowKey(row, index, this.gridOptions.rowKey)
            )
        );
    }

    getView(): DataGridView<Row> {
        return {
            ...this.view,
            allColumns: [...this.view.allColumns],
            columns: [...this.view.columns],
            rows: [...this.view.rows],
            filteredRows: [...this.view.filteredRows],
            sort: this.view.sort ? { ...this.view.sort } : null
        };
    }

    override syncOptions(nextOptions: DataGridOptions<Row>): void {
        super.syncOptions(nextOptions);
        this.state = createDataGridState(nextOptions, this.state);
        this.pruneSelection();
        this.update("options");
    }

    override destroy(): void {
        this.el.removeAttribute("data-data-grid-ready");
        this.events.clear();
        super.destroy();
    }

    private get gridOptions(): DataGridOptions<Row> {
        return this.options as DataGridOptions<Row>;
    }

    private bindEvents(): void {
        super.on(this.el, "click", (event) => this.handleClick(event));
        super.on(this.el, "change", (event) => this.handleChange(event));
        super.on(this.el, "input", (event) => this.handleInput(event));
    }

    private handleClick(event: Event): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const actionTrigger = target.closest<HTMLElement>("[data-grid-action], [data-action]");
        if (actionTrigger) {
            this.handleAction(event, actionTrigger);
            return;
        }

        const sortButton = target.closest<HTMLElement>("[data-grid-sort]");
        if (sortButton) {
            const field = sortButton.dataset.gridField;
            if (field) {
                this.sortBy(field);
            }
            return;
        }

        const pageButton = target.closest<HTMLElement>("[data-grid-page]");
        if (pageButton?.dataset.gridPage === "previous") {
            this.previousPage();
            return;
        }
        if (pageButton?.dataset.gridPage === "next") {
            this.nextPage();
            return;
        }

        if (target.closest("button, a, input, select, textarea, label")) {
            return;
        }

        const rowElement = target.closest<HTMLElement>("[data-grid-row]");
        if (!rowElement) {
            return;
        }

        const detail = this.getRowClickDetail(rowElement, event);
        if (!detail) {
            return;
        }

        this.emitGridEvent("row:click", detail);
        this.emit("data-grid:row-click", detail);
    }

    private handleChange(event: Event): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
            return;
        }

        if (target.matches("[data-grid-page-size]")) {
            this.setPageSize(Number(target.value));
            return;
        }

        if (target instanceof HTMLInputElement && target.matches("[data-grid-select-page]")) {
            this.selectCurrentPage(target.checked);
            return;
        }

        if (target instanceof HTMLInputElement && target.matches("[data-grid-select]")) {
            const sourceIndex = Number(target.dataset.gridSelect);
            const row = this.gridOptions.rows[sourceIndex];
            if (row) {
                this.selectRow(
                    getDataGridRowKey(row, sourceIndex, this.gridOptions.rowKey),
                    target.checked
                );
            }
        }
    }

    private handleInput(event: Event): void {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.matches("[data-grid-search]")) {
            this.queueSearch(target.value);
        }
    }

    private queueSearch(search: string): void {
        this.state.search = search;
        this.state.page = 1;
        if (this.searchQueued) {
            return;
        }

        this.searchQueued = true;
        queueTask(() => {
            this.searchQueued = false;
            this.update("search");
            this.emitGridEvent("search", { search: this.state.search });
            this.emit("data-grid:search", { search: this.state.search });
        });
    }

    private handleAction(event: Event, trigger: HTMLElement): void {
        const rowElement = trigger.closest<HTMLElement>("[data-grid-row]");
        if (!rowElement) {
            return;
        }

        const sourceIndex = Number(rowElement.dataset.gridRow);
        const row = this.gridOptions.rows[sourceIndex];
        if (!row) {
            return;
        }

        const field = trigger.closest<HTMLElement>("[data-grid-field]")?.dataset.gridField;
        const column = this.view.columns.find((entry) => entry.field === field)
            ?? this.view.allColumns.find((entry) => entry.field === field);
        if (!column) {
            return;
        }

        const detail: DataGridActionDetail<Row> = {
            action: trigger.dataset.gridAction || trigger.dataset.action || "",
            key: getDataGridRowKey(row, sourceIndex, this.gridOptions.rowKey),
            row,
            rowIndex: sourceIndex,
            column,
            trigger,
            originalEvent: event
        };

        this.emitGridEvent("action", detail);
        this.emit("data-grid:action", detail);
    }

    private getRowClickDetail(
        rowElement: HTMLElement,
        originalEvent: Event
    ): DataGridRowClickDetail<Row> | null {
        const sourceIndex = Number(rowElement.dataset.gridRow);
        const row = this.gridOptions.rows[sourceIndex];
        if (!row) {
            return null;
        }

        return {
            key: getDataGridRowKey(row, sourceIndex, this.gridOptions.rowKey),
            row,
            rowIndex: sourceIndex,
            originalEvent
        };
    }

    private pruneSelection(): void {
        const validKeys = new Set(this.gridOptions.rows.map((row, index) =>
            getDataGridRowKey(row, index, this.gridOptions.rowKey)
        ));
        for (const key of this.state.selectedKeys) {
            if (!validKeys.has(key)) {
                this.state.selectedKeys.delete(key);
            }
        }
    }

    private updateSelection(reason: string, changedKey?: DataGridRowKey): void {
        this.update(reason);
        const changedRow = typeof changedKey === "undefined"
            ? undefined
            : this.getSelectedRows().find((row, index) =>
                getDataGridRowKey(row, index, this.gridOptions.rowKey) === changedKey
            );
        const detail: DataGridSelectionDetail<Row> = {
            key: changedKey,
            row: changedRow,
            selectedKeys: this.getSelectedKeys(),
            selectedRows: this.getSelectedRows()
        };
        this.emitGridEvent("row:select", detail);
        this.emit("data-grid:selection", detail);
    }

    private emitPageChange(): void {
        const detail = {
            page: this.view.page,
            pageSize: this.view.pageSize,
            pageCount: this.view.pageCount
        };
        this.emitGridEvent("page:change", detail);
        this.emit("data-grid:page", detail);
    }

    private update(reason: string): void {
        this.view = createDataGridView(this.gridOptions, this.state);
        this.state.page = this.view.page;
        this.syncSideEffects();
        this.render();

        const detail: DataGridChangeDetail<Row> & { reason: string } = {
            reason,
            view: this.getView(),
            selectedKeys: this.getSelectedKeys(),
            selectedRows: this.getSelectedRows()
        };
        this.emit("data-grid:change", detail);
    }

    private syncSideEffects(): void {
        savePersistedDataGridState(this.gridOptions, {
            sort: this.state.sort,
            search: this.state.search,
            page: this.state.page,
            pageSize: this.state.pageSize,
            selectedKeys: this.getSelectedKeys(),
            visibleColumns: [...this.state.visibleColumns],
            columnOrder: [...this.state.columnOrder]
        });
        syncUrlDataGridState(this.gridOptions, this.state);
    }

    private render(): void {
        const activeSearch = canUseDOM()
            ? this.el.querySelector<HTMLInputElement>("[data-grid-search]")
            : null;
        const restoreSearchFocus = canUseDOM() && document.activeElement === activeSearch;
        const selectionStart = activeSearch?.selectionStart ?? null;
        const selectionEnd = activeSearch?.selectionEnd ?? null;

        renderDataGrid(this.el, {
            options: this.gridOptions,
            view: this.view,
            selectedKeys: this.state.selectedKeys
        });

        if (restoreSearchFocus) {
            const nextSearch = this.el.querySelector<HTMLInputElement>("[data-grid-search]");
            nextSearch?.focus();
            if (selectionStart !== null && selectionEnd !== null) {
                nextSearch?.setSelectionRange(selectionStart, selectionEnd);
            }
        }
    }

    private emitGridEvent<K extends DataGridEventName>(
        eventName: K,
        detail: DataGridEventMap<Row>[K]
    ): void {
        this.events.emit(eventName, detail);
    }
}

function queueTask(callback: () => void): void {
    if (typeof queueMicrotask === "function") {
        queueMicrotask(callback);
        return;
    }
    Promise.resolve().then(callback);
}
