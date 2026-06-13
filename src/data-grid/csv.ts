import { getDataGridCellValue } from "./query";
import { getExportColumns, getColumnLabel } from "./persistence";
import type { DataGridOptions, DataGridRow, DataGridState, DataGridView } from "./types";

export function exportDataGridCSV<Row extends DataGridRow>(
    options: DataGridOptions<Row>,
    state: Pick<DataGridState, "visibleColumns" | "columnOrder">,
    view: Pick<DataGridView<Row>, "filteredRows">,
    filename?: string
): string {
    const columns = getExportColumns(options, state);
    const lines = [
        columns.map((column, index) => escapeCSV(getColumnLabel(column, index))).join(",")
    ];

    for (const entry of view.filteredRows) {
        lines.push(columns.map((column) => {
            const value = getDataGridCellValue(entry.row, column);
            return escapeCSV(value);
        }).join(","));
    }

    const csv = lines.join("\n");

    if (filename && typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    return csv;
}

function escapeCSV(value: unknown): string {
    const text = value == null ? "" : String(value);
    if (!/[",\n]/.test(text)) {
        return text;
    }

    return `"${text.replace(/"/g, "\"\"")}"`;
}
