import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

assert.equal(typeof window, 'undefined');
assert.equal(typeof document, 'undefined');

const esm = await import('../dist/tiny-engine.esm.js');
const esmGrid = await import('../dist/data-grid/index.esm.js');
const cjs = require('../dist/tiny-engine.cjs');
const cjsGrid = require('../dist/data-grid/index.cjs');

for (const entry of [esm, cjs]) {
    assert.equal(entry.canUseDOM(), false);
    assert.equal(typeof entry.UI, 'object');
    assert.equal(typeof entry.DataGrid, 'function');
    entry.UI.init();
    entry.UI.scan();
    entry.UI.observe();
    entry.UI.destroy();
}

for (const entry of [esmGrid, cjsGrid]) {
    assert.equal(typeof entry.DataGrid, 'function');
    assert.equal(typeof entry.createDataGridPlugin, 'function');
}

console.log('SSR smoke test passed for ESM, CommonJS, and DataGrid exports.');
