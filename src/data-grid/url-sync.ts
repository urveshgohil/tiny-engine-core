import { canUseDOM } from "../core/utils";
import { normalizePositiveInt } from "./state";
import type { DataGridOptions, DataGridRow, DataGridSort, DataGridState } from "./types";

interface UrlState {
    search?: string;
    page?: number;
    pageSize?: number;
    sort?: DataGridSort | null;
}

export function loadUrlDataGridState<Row extends DataGridRow>(
    options: DataGridOptions<Row>
): UrlState | null {
    if (!options.urlSync || !canUseDOM()) {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    const key = getUrlSyncKey(options);
    const search = params.get(`${key}-q`) ?? undefined;
    const page = params.has(`${key}-page`)
        ? normalizePositiveInt(params.get(`${key}-page`), 1)
        : undefined;
    const pageSize = params.has(`${key}-pageSize`)
        ? normalizePositiveInt(params.get(`${key}-pageSize`), 10)
        : undefined;
    const sortField = params.get(`${key}-sort`);
    const sortDirection = params.get(`${key}-dir`);

    return {
        search,
        page,
        pageSize,
        sort: sortField && (sortDirection === "asc" || sortDirection === "desc")
            ? { columnId: sortField, direction: sortDirection }
            : undefined
    };
}

export function syncUrlDataGridState<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    state: Pick<DataGridState, "search" | "page" | "pageSize" | "sort">
): void {
    if (!options.urlSync || !canUseDOM()) {
        return;
    }

    const url = new URL(window.location.href);
    const key = getUrlSyncKey(options);

    setParam(url.searchParams, `${key}-q`, state.search || null);
    setParam(url.searchParams, `${key}-page`, String(state.page));
    setParam(url.searchParams, `${key}-pageSize`, String(state.pageSize));
    setParam(url.searchParams, `${key}-sort`, state.sort?.columnId ?? null);
    setParam(url.searchParams, `${key}-dir`, state.sort?.direction ?? null);

    window.history.replaceState(window.history.state, "", url);
}

function getUrlSyncKey<Row extends DataGridRow>(options: DataGridOptions<Row>): string {
    const base = options.persistKey || options.ariaLabel || "data-grid";
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "data-grid";
}

function setParam(params: URLSearchParams, key: string, value: string | null): void {
    if (value == null || value === "") {
        params.delete(key);
        return;
    }

    params.set(key, value);
}
