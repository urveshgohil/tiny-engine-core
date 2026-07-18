import { readFile, writeFile } from 'node:fs/promises';

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
    throw new Error('Usage: node scripts/version.mjs <patch|minor|major>');
}

const packageUrl = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(await readFile(packageUrl, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const next = type === 'major' ? [major + 1, 0, 0]
    : type === 'minor' ? [major, minor + 1, 0]
    : [major, minor, patch + 1];

pkg.version = next.join('.');
await writeFile(packageUrl, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Version bumped to v${pkg.version}.`);
