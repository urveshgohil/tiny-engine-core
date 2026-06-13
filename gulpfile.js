"use strict";
import gulp from 'gulp';
import bump from 'gulp-bump';
import git from 'gulp-git';
import fs from 'fs';
import esbuild from 'gulp-esbuild';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Read package.json for versioning
const pkg = JSON.parse(fs.readFileSync('./package.json'));
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${new Date().getFullYear()} | MIT License */\n`;

const dataGridExternalCorePlugin = {
    name: 'data-grid-external-core',
    setup(build) {
        build.onResolve({ filter: /^\.\.\/core\/base$/ }, () => ({
            path: 'tiny-engine-core',
            external: true
        }));
    }
};

// JavaScript Builds
const javascriptIifeTask = () => gulp.src(['src/index.ts'])
    .pipe(esbuild({
        bundle: true,
        format: 'iife',
        globalName: 'UI',
        minify: true,
        sourcemap: true,
        target: ['es2018'],
        banner: { js: banner },
        outfile: 'tiny-engine.min.js'
    }))
    .pipe(gulp.dest('dist'));

const javascriptEsmTask = () => gulp.src(['src/index.ts'])
    .pipe(esbuild({
        bundle: true,
        format: 'esm',
        minify: true,
        sourcemap: true,
        target: ['es2018'],
        banner: { js: banner },
        outfile: 'tiny-engine.esm.js'
    }))
    .pipe(gulp.dest('dist'));

const javascriptCjsTask = () => gulp.src(['src/index.ts'])
    .pipe(esbuild({
        bundle: true,
        format: 'cjs',
        minify: true,
        sourcemap: true,
        target: ['es2018'],
        banner: { js: banner },
        outfile: 'tiny-engine.cjs'
    }))
    .pipe(gulp.dest('dist'));

const dataGridEsmTask = () => gulp.src(['src/data-grid/index.ts'])
    .pipe(esbuild({
        bundle: true,
        format: 'esm',
        minify: true,
        sourcemap: true,
        target: ['es2018'],
        plugins: [dataGridExternalCorePlugin],
        banner: { js: banner },
        outfile: 'index.esm.js'
    }))
    .pipe(gulp.dest('dist/data-grid'));

const dataGridCjsTask = () => gulp.src(['src/data-grid/index.ts'])
    .pipe(esbuild({
        bundle: true,
        format: 'cjs',
        minify: true,
        sourcemap: true,
        target: ['es2018'],
        plugins: [dataGridExternalCorePlugin],
        banner: { js: banner },
        outfile: 'index.cjs'
    }))
    .pipe(gulp.dest('dist/data-grid'));

const dataGridCssTask = () => gulp.src(['src/data-grid/style.css'])
    .pipe(gulp.dest('dist/data-grid'));

// Types
const typesTask = async () => {
    await execAsync('npx tsc --emitDeclarationOnly --outDir dist/types');
};

const cleanTask = async () => {
    await fs.promises.rm('dist', { recursive: true, force: true });
};

// Watch task
const watchTask = () => gulp.watch(['src/**/*.ts', 'src/**/*.d.ts'], gulp.series('build'));

// Version bump
const bumpVersion = (type) => gulp.src('./package.json')
    .pipe(bump({ type }))
    .pipe(gulp.dest('./'));

const commitVersion = () => {
    const version = `v${pkg.version}`;
    return gulp.src('./')
        .pipe(git.add())
        .pipe(git.commit(`Release ${version}`))
        .pipe(git.tag(version, `Release ${version}`, (err) => {
            if (err) throw err;
        }));
};

// Tasks
gulp.task('clean', cleanTask);
gulp.task('javascript:iife', javascriptIifeTask);
gulp.task('javascript:esm', javascriptEsmTask);
gulp.task('javascript:cjs', javascriptCjsTask);
gulp.task('data-grid:esm', dataGridEsmTask);
gulp.task('data-grid:cjs', dataGridCjsTask);
gulp.task('data-grid:css', dataGridCssTask);
gulp.task('types', typesTask);
gulp.task('build', gulp.series('clean', gulp.parallel(
    'javascript:iife',
    'javascript:esm',
    'javascript:cjs',
    'data-grid:esm',
    'data-grid:cjs',
    'data-grid:css',
    'types'
)));
gulp.task('watch', watchTask);
gulp.task('bump:patch', () => bumpVersion('patch'));
gulp.task('bump:minor', () => bumpVersion('minor'));
gulp.task('bump:major', () => bumpVersion('major'));
gulp.task('release', gulp.series('bump:patch', 'build', commitVersion));
gulp.task('default', gulp.series('build', 'watch'));
