# Tiny engine (Core)
A minimalist, framework-agnostic, and tree‑shakable JavaScript runtime for building interactive UI components—without dependencies.

This core edition gives you lightweight component lifecycle management (`register`, `init`, `observe`, etc.) and a simple foundation for your own plugins (accordion, modal, dropdown, etc.).

## Features
1. **Framework‑independent:** Works with plain HTML, React, Vue, or Svelte.
2. **Zero dependencies:** Pure TypeScript → compiled using Esbuild.
3. **Tree‑shakable:** Import only what you need.
4. **Component lifecycle helpers:** `on()`, `destroy()`, `emit()`, etc.
5. **Automatic initialization:** Discovers elements with configurable `ui-*` attributes (customizable prefix).
6. **Dynamic prefix support:** `UI.config({ prefix })` + `getPrefix()` utility.
7. **Lightweight:** ~2KB gzipped.


## Installation
### Clone the Repository
```bash
git clone https://github.com/urveshgohil/tiny-engine-core
```

### Install Dependencies
**npm**
```bash
npm install tiny-engine-core
```

**yarn**
```bash
yarn add tiny-engine-core
```

**pnpm**
```bash
pnpm add tiny-engine-core
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
│   │   ├── base.ts
│   │   ├── engine.ts
│   │   └── utils.ts
│   └── index.ts
├── dist/              # Compiled output
│   ├── types/
│   │   ├── core/
│   │   │   ├── base.d.ts
│   │   │   ├── engine.d.ts
│   │   │   └── utils.d.ts
│   │   └── index.d.ts
│   ├── tiny-engine.min.js
│   ├── tiny-engine.esm.js
│   ├── tiny-engine.cjs.js
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
gulp bump:patch   # Bump patch version (bug fixes)
gulp bump:minor   # Bump minor version (new features)
gulp bump:major   # Bump major version (breaking)
```

### Gulp Tasks
1. javascript: Bundles and minifies JavaScript using Esbuild.

### Build Pipeline
1. Gulp 5.0.1 → task runner
2. Esbuild 0.28.0 → fast bundling and minification
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
    class MyDropdown extends UI.Capsule {
        constructor(el) {
        super(el);
        console.log('Dropdown initialized!');
        }
    }
    UI.config({ prefix: 'custom' });
    UI.register('dropdown', MyDropdown);
</script>
```

### In Modern JS (ES Modules)
```js
import { UI, Capsule, getPrefix } from 'tiny-engine-core';

class Tabs extends Capsule {
    constructor(el) {
        super(el);
        const prefix = getPrefix(); // 'ui' or configured prefix
        console.log(`Tabs using ${prefix}- prefix`);
    }
}

UI.config({ prefix: 'app' }); // Optional: change to 'app-'
UI.register('tabs', Tabs);
UI.init();
```

### Prefix System
```js
// Default: ui-*
UI.register('tabs', Tabs); // Finds [ui-tabs]

// Custom prefix
UI.config({ prefix: 'app' }); // Finds [app-tabs]
UI.register('tabs', Tabs);

// In components
import { getPrefix } from 'tiny-engine-core';
class MyComponent extends Capsule {
    constructor(el) {
        super(el);
        const prefix = getPrefix(); // 'app' (syncs with UI.config)
    }
}
```

### Capsule Base Class
```js
class MyComponent extends Capsule {
    constructor(el) {
        super(el, options);
        this.on(el, 'click', this.handleClick); // Auto-cleanup
    }

    destroy() { super.destroy(); } // Removes all listeners
    emit('open', { id: 1 }); // Dispatches CustomEvent
}
```

### HTML + Custom Prefix
```HTML
<!-- app- prefix (configured via UI.config) -->
<div app-modal app-backdrop="true">
    <button app-dismiss="modal">Close</button>
</div>
<button app-modal-target="#myModal">Open</button>

```

### React Capsule

```js
import { UI, Capsule } from 'tiny-engine-core';

class Tooltip extends Capsule {
    constructor(el) {
        super(el);
        this.on(el, 'mouseenter', this.show);
    }
}

UI.register('tooltip', Tooltip);
```

### Complete API Reference

| Feature        | TypeScript                   | JavaScript | HTML Example             |
| -------------- | ---------------------------- | ---------- | ------------------------ |
| Config         | UI.config({ prefix: 'app' }) | Same       | <div app-tabs>           |
| Register       | UI.register('tabs', Tabs)    | Same       | <div ui-tabs>  (default) |
| Prefix Utility | getPrefix()                  | Same       | Dynamic selectors        |
| Init           | UI.init()                    | Same       | Auto-finds [prefix-name] |
| Observe        | UI.observe()                 | Same       | Dynamic content          |
| Refs           | this.refs.toggle             | Same       | ref="toggle"             |
| Directives     | Auto-bound                   | Auto-bound | @click="select('Home')   |
| Events         | this.emit('change', data)    | Same       | @change="onChange"       |
| Lifecycle      | on/offAll/destroy            | Same       | Event management         |

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