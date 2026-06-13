import type { UIPluginObject } from "../core/engine";
import { DataGrid } from "./data-grid";
import type { DataGridPluginOptions } from "./types";

export function createDataGridPlugin(options: DataGridPluginOptions = {}): UIPluginObject {
    const name = options.name ?? "data-grid";

    return {
        name: "tiny-engine-core/data-grid",
        version: "1.8.0",
        install(ui) {
            ui.register(name, DataGrid);
            ui.debug(`DataGrid registered as "${name}".`);
        }
    };
}
