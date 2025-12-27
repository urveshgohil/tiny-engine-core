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
        outfile: 'tiny-engine.cjs.js'
    }))
    .pipe(gulp.dest('dist'));

// Types
const typesTask = async () => {
    await execAsync('npx tsc --emitDeclarationOnly --outDir dist/types');
};

// Clean task - BUILT-IN GULP (no del needed)
const cleanTask = () => gulp.src('dist', { read: false, allowEmpty: true })
    .pipe(gulp.dest('.')); // Gulp's built-in clean pattern

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
gulp.task('types', typesTask);
gulp.task('build', gulp.series('clean', gulp.parallel('javascript:iife', 'javascript:esm', 'javascript:cjs', 'types')));
gulp.task('watch', watchTask);
gulp.task('bump:patch', () => bumpVersion('patch'));
gulp.task('bump:minor', () => bumpVersion('minor'));
gulp.task('bump:major', () => bumpVersion('major'));
gulp.task('release', gulp.series('bump:patch', 'build', commitVersion));
gulp.task('default', gulp.series('build', 'watch'));
