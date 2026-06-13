import { getDataGridCellValue } from "./query";
import type {
    DataGridOptions,
    DataGridResolvedColumn,
    DataGridRow,
    DataGridRowKey,
    DataGridView
} from "./types";

export interface DataGridRenderContext<Row extends DataGridRow> {
    options: DataGridOptions<Row>;
    view: DataGridView<Row>;
    selectedKeys: ReadonlySet<DataGridRowKey>;
}

export function renderDataGrid<Row extends DataGridRow>(
    host: HTMLElement,
    context: DataGridRenderContext<Row>
): void {
    const { options, view } = context;
    const root = element("div", "tiny-data-grid");
    const toolbar = renderToolbar(options, view);
    const viewport = element(
        "div",
        options.stickyHeader ? "tiny-data-grid__viewport tiny-data-grid__viewport--sticky" : "tiny-data-grid__viewport"
    );
    const table = document.createElement("table");

    if (options.stickyHeader) {
        root.classList.add("tiny-data-grid--sticky-header");
    }
    if (view.loading) {
        root.classList.add("tiny-data-grid--loading");
    }

    table.className = "tiny-data-grid__table";
    table.setAttribute("aria-label", options.ariaLabel ?? "Data grid");
    table.append(
        renderHeader(options, view, context.selectedKeys),
        renderBody(options, view, context.selectedKeys)
    );
    viewport.append(table);

    if (toolbar) root.append(toolbar);
    root.append(viewport);
    if (options.pagination) root.append(renderPagination(options, view));

    host.replaceChildren(root);
    host.setAttribute("data-data-grid-ready", "true");
}

function renderToolbar<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    view: DataGridView<Row>
): HTMLElement | null {
    if (!options.searchable) return null;

    const toolbar = element("div", "tiny-data-grid__toolbar");
    const label = document.createElement("label");
    const labelText = element("span", "tiny-data-grid__search-label");
    const input = document.createElement("input");

    label.className = "tiny-data-grid__search";
    labelText.textContent = "Search";
    input.type = "search";
    input.value = view.search;
    input.placeholder = "Search rows";
    input.setAttribute("data-grid-search", "");
    label.append(labelText, input);
    toolbar.append(label);
    return toolbar;
}

function renderHeader<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    view: DataGridView<Row>,
    selectedKeys: ReadonlySet<DataGridRowKey>
): HTMLTableSectionElement {
    const head = document.createElement("thead");
    const row = document.createElement("tr");

    if (options.selection !== "none") {
        const selectionHeader = document.createElement("th");
        selectionHeader.scope = "col";
        selectionHeader.className = "tiny-data-grid__selection";
        selectionHeader.setAttribute("aria-label", "Select all rows on current page");

        if (options.selection === "multiple") {
            const input = document.createElement("input");
            const selectedCount = view.rows.filter((entry) => selectedKeys.has(entry.key)).length;

            input.type = "checkbox";
            input.checked = view.rows.length > 0 && selectedCount === view.rows.length;
            input.indeterminate = selectedCount > 0 && selectedCount < view.rows.length;
            input.disabled = view.rows.length === 0 || view.loading;
            input.setAttribute("aria-label", "Select all rows on current page");
            input.setAttribute("data-grid-select-page", "");
            selectionHeader.append(input);
        }

        row.append(selectionHeader);
    }

    view.columns.forEach((column, columnIndex) => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.style.textAlign = column.align ?? "start";
        cell.dataset.gridField = column.field;
        if (column.width) {
            cell.style.width = column.width;
        }

        if (column.sortable === false || view.loading) {
            cell.textContent = column.title;
        } else {
            const button = document.createElement("button");
            const active = view.sort?.columnId === column.field;
            const direction = active ? view.sort?.direction : undefined;

            button.type = "button";
            button.className = "tiny-data-grid__sort";
            button.textContent = column.title;
            button.setAttribute("data-grid-sort", String(columnIndex));
            button.setAttribute("data-grid-field", column.field);
            cell.setAttribute(
                "aria-sort",
                direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"
            );
            if (direction) {
                const indicator = element("span", "tiny-data-grid__sort-indicator");
                indicator.setAttribute("aria-hidden", "true");
                indicator.textContent = direction === "asc" ? " ASC" : " DESC";
                button.append(indicator);
            }
            cell.append(button);
        }

        row.append(cell);
    });

    head.append(row);
    return head;
}

function renderBody<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    view: DataGridView<Row>,
    selectedKeys: ReadonlySet<DataGridRowKey>
): HTMLTableSectionElement {
    const body = document.createElement("tbody");

    if (view.loading) {
        renderLoadingRows(body, options, view.columns.length);
        return body;
    }

    if (view.rows.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = view.columns.length + (options.selection === "none" ? 0 : 1);
        cell.className = "tiny-data-grid__empty";
        cell.textContent = options.emptyState || options.emptyText || "No rows found";
        row.append(cell);
        body.append(row);
        return body;
    }

    view.rows.forEach((entry) => {
        const row = document.createElement("tr");
        const selected = selectedKeys.has(entry.key);
        row.setAttribute("data-grid-row", String(entry.sourceIndex));
        row.setAttribute("data-grid-key", String(entry.key));
        row.setAttribute("aria-selected", String(selected));

        if (options.selection !== "none") {
            const selectionCell = document.createElement("td");
            const input = document.createElement("input");
            input.type = options.selection === "single" ? "radio" : "checkbox";
            input.name = options.selection === "single" ? "tiny-data-grid-row" : "";
            input.checked = selected;
            input.setAttribute("aria-label", `Select row ${entry.sourceIndex + 1}`);
            input.setAttribute("data-grid-select", String(entry.sourceIndex));
            selectionCell.className = "tiny-data-grid__selection";
            selectionCell.append(input);
            row.append(selectionCell);
        }

        view.columns.forEach((column) => {
            const cell = document.createElement("td");
            const value = getDataGridCellValue(entry.row, column);
            const rendered = column.render
                ? column.render(value, entry.row, column, entry.sourceIndex)
                : column.format
                    ? column.format({
                        row: entry.row,
                        rowIndex: entry.sourceIndex,
                        column,
                        value
                    })
                    : value;
            cell.style.textAlign = column.align ?? "start";
            cell.dataset.gridField = column.field;
            appendCellValue(cell, rendered, Boolean(column.render || column.format));
            row.append(cell);
        });
        body.append(row);
    });

    return body;
}

function renderLoadingRows(
    body: HTMLTableSectionElement,
    options: Pick<DataGridOptions, "selection" | "pageSize">,
    columnCount: number
): void {
    const rowCount = Math.max(3, Math.min(5, Number(options.pageSize ?? 3)));

    for (let index = 0; index < rowCount; index += 1) {
        const row = document.createElement("tr");

        if (options.selection !== "none") {
            const selectionCell = document.createElement("td");
            selectionCell.className = "tiny-data-grid__selection";
            selectionCell.append(element("span", "tiny-data-grid__skeleton tiny-data-grid__skeleton--checkbox"));
            row.append(selectionCell);
        }

        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
            const cell = document.createElement("td");
            cell.append(element("span", "tiny-data-grid__skeleton"));
            row.append(cell);
        }

        body.append(row);
    }
}

function renderPagination<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    view: DataGridView<Row>
): HTMLElement {
    const footer = element("div", "tiny-data-grid__pagination");
    const status = element("span", "tiny-data-grid__status");
    const controls = element("div", "tiny-data-grid__page-controls");
    const previous = paginationButton("Previous", "previous", view.page <= 1 || view.loading);
    const next = paginationButton("Next", "next", view.page >= view.pageCount || view.loading);

    status.setAttribute("aria-live", "polite");
    status.textContent = view.loading
        ? "Loading rows"
        : view.filteredCount === 0
            ? "No rows"
            : `${view.start}-${view.end} of ${view.filteredCount}`;
    controls.append(previous);

    if ((options.pageSizeOptions?.length ?? 0) > 0) {
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Rows per page");
        select.setAttribute("data-grid-page-size", "");
        select.disabled = view.loading;
        options.pageSizeOptions?.forEach((size) => {
            const option = document.createElement("option");
            option.value = String(size);
            option.textContent = `${size} per page`;
            option.selected = size === view.pageSize;
            select.append(option);
        });
        controls.append(select);
    }

    const page = element("span", "tiny-data-grid__page");
    page.textContent = `Page ${view.page} of ${view.pageCount}`;
    controls.append(page, next);
    footer.append(status, controls);
    return footer;
}

function paginationButton(label: string, action: string, disabled: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute("data-grid-page", action);
    return button;
}

function appendCellValue(
    cell: HTMLTableCellElement,
    value: unknown,
    allowHtml: boolean
): void {
    if (typeof Node !== "undefined" && value instanceof Node) {
        cell.append(value);
        return;
    }

    if (allowHtml && typeof value === "string") {
        cell.innerHTML = value;
        return;
    }

    cell.textContent = value == null ? "" : String(value);
}

function element<Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string
): HTMLElementTagNameMap[Tag] {
    const node = document.createElement(tag);
    node.className = className;
    return node;
}
