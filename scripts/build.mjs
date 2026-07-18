import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, watch } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const root = new URL('..', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const isWatch = process.argv.includes('--watch');
const cleanOnly = process.argv.includes('--clean');

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code) => code === 0
            ? resolve()
            : reject(new Error(`${command} exited with code ${code}`)));
    });
}

async function getBanner() {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
    return `/*! ${pkg.name} v${pkg.version} | (c) ${new Date().getFullYear()} | MIT License */\n`;
}

const dataGridExternalCorePlugin = {
    name: 'data-grid-external-core',
    setup(build) {
        build.onResolve({ filter: /^\.\.\/core\/base$/ }, () => ({
            path: 'tiny-engine-core',
            external: true
        }));
    }
};

async function compile() {
    const banner = await getBanner();
    const options = [
        ['src/index.ts', 'dist/tiny-engine.min.js', 'iife', { globalName: 'UI' }],
        ['src/index.ts', 'dist/tiny-engine.esm.js', 'esm'],
        ['src/index.ts', 'dist/tiny-engine.cjs', 'cjs'],
        ['src/data-grid/index.ts', 'dist/data-grid/index.esm.js', 'esm', { plugins: [dataGridExternalCorePlugin] }],
        ['src/data-grid/index.ts', 'dist/data-grid/index.cjs', 'cjs', { plugins: [dataGridExternalCorePlugin] }]
    ];

    await Promise.all([
        ...options.map(([entryPoint, outfile, format, extra = {}]) => build({
            entryPoints: [entryPoint],
            outfile,
            bundle: true,
            format,
            minify: true,
            sourcemap: true,
            target: 'es2018',
            banner: { js: banner },
            ...extra
        })),
        cp(new URL('../src/data-grid/style.css', import.meta.url), new URL('../dist/data-grid/style.css', import.meta.url)),
        run(process.execPath, ['node_modules/typescript/bin/tsc', '--emitDeclarationOnly', '--outDir', 'dist/types'])
    ]);
}

async function clean() {
    await rm(dist, { recursive: true, force: true });
}

async function buildOnce() {
    await clean();
    await mkdir(new URL('../dist/data-grid/', import.meta.url), { recursive: true });
    await compile();
    console.log('Build completed.');
}

if (cleanOnly) {
    await clean();
} else {
    await buildOnce();
}

if (isWatch) {
    let rebuilding = false;
    let queued = false;
    const rebuild = async () => {
        if (rebuilding) {
            queued = true;
            return;
        }
        rebuilding = true;
        try {
            await buildOnce();
        } catch (error) {
            console.error(error);
        } finally {
            rebuilding = false;
            if (queued) {
                queued = false;
                rebuild();
            }
        }
    };

    console.log('Watching src for changes.');
    const watcher = watch(new URL('../src/', import.meta.url), { recursive: true });
    for await (const event of watcher) {
        if (event.filename?.endsWith('.ts') || event.filename?.endsWith('.css')) rebuild();
    }
}
