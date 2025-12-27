# Tiny engine (Core)
A minimalist, framework-agnostic, and tree‑shakable JavaScript runtime for building interactive UI components—without dependencies.

This core edition gives you lightweight component lifecycle management (register, init, observe, etc.)
and a simple foundation for your own plugins (accordion, modal, dropdown, etc.).

## Features
1. Framework‑independent: Works with plain HTML, React, Vue, or Svelte.
2. Zero dependencies: Pure TypeScript → compiled using Esbuild.
3. Tree‑shakable: Import only what you need.
4. Component lifecycle helpers: on(), destroy(), emit(), etc.
5. Automatic initialization: Discovers elements with ui-* attributes.
6. Lightweight: ~2KB gzipped.


## Installation
### Clone the Repository
```bash
git clone https://github.com/urveshgohil/tiny-core-engine
```

### Install Dependencies
**npm**
```bash
npm install tiny-core-engine
```

**yarn**
```bash
yarn add tiny-core-engine
```

**pnpm**
```bash
pnpm add tiny-core-engine
```

## Development Workflow
### Start the Development Server
To compile bundle JavaScript and watch for changes:
```bash
npm watch
yarn watch
pnpm watch
```

This will:
1. Compile all TypeScript files from src/
2. Output minified bundles in dist/
3. Watch for file changes while developing


## Directory Structure
```bash
.
├── src/               # TypeScript source
│   ├── core/
│   │   ├── base.d.ts
│   │   ├── engine.d.ts
│   │   └── utils.d.ts
│   └── index.d.ts
├── dist/              # Compiled output
│   ├── tiny-engine.min.js
│   ├── tiny-engine.esm.js
│   ├── tiny-engine.cjs.js
│   └── types/
├── gulpfile.js        # Build automation (Gulp + Esbuild)
├── package.json       # Metadata & dependencies
├── README.md
└── tsconfig.json
```

## Build Tools
```bash
gulp              # Build all formats + watch
gulp types        # Types mode only
gulp release      # Bump patch + build + git commit/tag
gulp watch        # Watch mode only
gulp bump:patch   # Bump patch version
gulp bump:minor   # Bump minor version
gulp bump:major   # Bump major version
```

### Gulp Tasks
1. javascript: Bundles and minifies JavaScript using Esbuild.

### Build Pipeline
1. Gulp 5.0.1 → task runner
2. Esbuild 0.27.2 → fast bundling and minification
3. gulp-bump 3.2.0 → version management
4. gulp-git 2.11.0 → commit and tagging automation

### Contributing
Feel free to submit issues and pull requests to improve the framework-agnostic. Contributions are welcome!

### Usage
1. Add JS file from the dist/ directory to your project.
2. Link them in your HTML file:

### In Browser (script tag)
```js
<script src="dist/tiny-engine.min.js"></script>
<script>
    class MyDropdown extends UI.Component {
        constructor(el) {
        super(el);
        console.log('Dropdown initialized!');
        }
    }

    UI.register('dropdown', MyDropdown);
</script>
```

### In Modern JS (ES Modules)
```js
import { UI, Component } from 'tiny-engine';

class MyDropdown extends Component {
    constructor(el) {
        super(el);
        console.log('Dropdown initialized!');
    }
}

// Register it
UI.register('dropdown', MyDropdown);
UI.init();
```

### Contributing
Contributions are welcome!
Please open issues or submit pull requests to suggest new core features, optimizations, or docs improvements.

1. Fork this repo
2. Create a feature branch
3. Commit your changes
4. Push and open a PR

### License
Released under the MIT License.
© 2025 Tiny engine Authors — open‑source forever.