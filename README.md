# Tiny engine (Core)
A minimalist, framework-agnostic, and tree‑shakable JavaScript runtime for building interactive UI components—without dependencies.

This core edition gives you lightweight component lifecycle management (`register`, `init`, `observe`, etc.) and a simple foundation for your own plugins (accordion, modal, dropdown, etc.).

[Tiny Engine (Core)](https://demo.urveshgohil.in/tiny-engine/)

## Features
1. **Framework‑independent:** Works with plain HTML, React, Vue, or Svelte.
2. **Zero dependencies:** Pure TypeScript → compiled using Esbuild.
3. **Tree‑shakable:** Import only what you need.
4. **Component lifecycle helpers:** `on()`, `destroy()`, `emit()`, etc.
5. **Automatic initialization:** Discovers elements with configurable `ui-*` attributes (customizable prefix).
6. **Dynamic prefix support:** `UI.config({ prefix })` + `getPrefix()` utility.
7. **TinyRequest:** A tiny dependency-free request layer built on native fetch with timeout, retry, abort, caching, and interceptors.
8. **Lightweight:** approx. 6KB gzipped.

## 1.7.0 (2026-05-27)
[CHANGELOG.md](CHANGELOG.md)


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
│   │   ├── request.ts
│   │   ├── store.ts
│   │   ├── uid.ts
│   │   └── utils.ts
│   └── index.ts
├── dist/              # Compiled output
│   ├── types/
│   │   ├── core/
│   │   │   ├── base.d.ts
│   │   │   ├── engine.d.ts
│   │   │   ├── store.d.ts
│   │   │   ├── uid.d.ts
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
    UI.config({ prefix: 'app' });

    const stop = UI.on('dataapi:trigger', (event) => {
        console.log('Data API fired:', event.detail.name);
    });

    UI.emit('app:ready', { version: '1.7.0' });

    // UI.init() and UI.observe() auto-run in the browser build.
    // Call stop() later if you want to remove the bus listener.
</script>
```

### In Modern JS (ES Modules)
```js
import { UI, Capsule, getPrefix } from 'tiny-engine-core';

class Tabs extends Capsule {
    constructor(el, options = {}) {
        super(el, options);
        const prefix = getPrefix(); // 'ui' or configured prefix
        this.onPropChange('active', (next) => {
            console.log('Active tab:', next);
        });

        this.on(this.el, 'click', (event) => {
            const action = event.target.closest('[data-tab]');
            if (!action) return;

            this.props.active = action.getAttribute('data-tab');
            this.emit('tabs:change', { active: this.props.active });
            UI.emit('tabs:global-change', { active: this.props.active });
        });

        console.log(`Tabs using ${prefix}- prefix`);
    }
}

UI.config({ prefix: 'app' }); // Optional: change to 'app-'
UI.register('tabs', Tabs);
UI.init();
UI.observe();
```

### v1.7.0 TinyRequest
```js
import { request, TinyRequest } from 'tiny-engine-core';

const users = await request.get('/api/users', {
    cache: true,
    timeout: 5000,
    retry: 2
});

await request.post('/api/users', {
    name: 'Urvesh'
});

request.interceptors.request.use((url, init) => ({
    ...init,
    headers: {
        ...Object.fromEntries(new Headers(init.headers)),
        authorization: 'Bearer token'
    }
}));

request.timeout(5000).retry(2).cache(true);
request.abort('/api/users');

const api = new TinyRequest({ baseUrl: '/api', timeout: 5000 });
```

### v1.6.0 Production Runtime APIs
```js
import { UI } from 'tiny-engine-core';

UI.config({
    prefix: 'app',
    hydrate: true // Trust SSR markup and avoid no-op option writes.
});

UI.register('modal', Modal);

// Full document boot.
UI.init();
UI.observe();

// Partial scan for portals, AJAX blocks, route fragments, or hydration islands.
UI.scan(document.querySelector('#route-fragment'));

// Explicit teardown for React/Vue unmounts, route changes, HMR, or micro-frontends.
UI.destroy(document.querySelector('#route-fragment'));

// Call with no root to destroy all active capsules and stop global observers.
UI.destroy();

console.log(UI.devtools().inspect().metrics);
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
    constructor(el, options = {}) {
        super(el, options);
        const prefix = getPrefix(); // 'app' (syncs with UI.config)
    }
}
```

### Capsule Base Class
```js
class MyComponent extends Capsule {
    constructor(el, options = {}) {
        super(el, options);
        this.on(this.el, 'click', this.handleClick); // Auto-cleanup
        this.onPropChange('open', (next, prev) => {
            console.log('open changed:', prev, '->', next);
        });
    }

    handleClick = () => {
        const event = this.emit('before:open', { id: 1 }, { cancelable: true });
        if (event.defaultPrevented) return;

        this.props.open = true;
        UI.emit('modal:opened', { id: this.uid });
    };

    destroy() {
        super.destroy(); // Removes all listeners and store subscriptions
    }
}
```

### HTML + Custom Prefix
```HTML
<!-- app- prefix (configured via UI.config) -->
<div id="settingsModal" app-modal app-modal-open="false" ref="modal">
    <button
        type="button"
        data-app-toggle="modal"
        data-app-action="close"
        data-target="#settingsModal"
    >
        Close
    </button>
</div>

<button
    type="button"
    data-app-toggle="modal"
    data-target="#settingsModal"
>
    Open
</button>
```

### React Functional Component

```jsx
import { useEffect, useRef } from 'react';
import { UI } from 'tiny-engine-core';

UI.config({ prefix: 'app' });
UI.register('modal', (el, api) => {
    const setState = (open) => {
        api.props.open = open;
        el.setAttribute('data-state', open ? 'open' : 'closed');
        UI.emit('modal:change', { open, id: api.uid });
    };

    return {
        open() {
            setState(true);
        },
        close() {
            const event = api.emit('before:close', null, { cancelable: true });
            if (event.defaultPrevented) return false;

            setState(false);
            return true;
        },
        toggle() {
            if (api.props.open) return this.close();
            this.open();
            return true;
        }
    };
});

export function ModalDemo() {
    const hostRef = useRef(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        UI.getOrCreate(host, 'modal', { open: false });
        const off = UI.on('modal:change', (event) => {
            console.log('Modal changed:', event.detail);
        });

        return () => {
            off();
            UI.destroy(host);
        };
    }, []);

    return (
        <>
            <div ref={hostRef} app-modal app-modal-open="false">
                React-powered modal host
            </div>

            <button
                type="button"
                data-app-toggle="modal"
                data-target="[app-modal]"
            >
                Toggle modal
            </button>
        </>
    );
}
```

### Functional Capsule

```js
import { UI } from 'tiny-engine-core';

UI.register('modal', (el, api) => {
    const setState = (open) => {
        api.props.open = open;
        el.setAttribute('data-state', open ? 'open' : 'closed');
        UI.emit('modal:change', { open, id: api.uid });
    };

    api.onPropChange('open', (open) => {
        el.setAttribute('aria-hidden', String(!open));
    });

    return {
        open() {
            setState(true);
        },
        close() {
            const event = api.emit('before:close', null, { cancelable: true });
            if (event.defaultPrevented) return false;

            setState(false);
            return true;
        },
        toggle() {
            if (api.props.open) return this.close();
            this.open();
            return true;
        },
        syncOptions(nextOptions) {
            el.setAttribute('data-state', nextOptions.open ? 'open' : 'closed');
        },
        destroy() {
            el.removeAttribute('data-state');
        }
    };
});
```

### Store Middleware

```js
import { CapsuleStore } from 'tiny-engine-core';

const store = new CapsuleStore(
    (state, action) => {
        if (action.type === 'increment') {
            return { ...state, count: state.count + 1 };
        }

        return state;
    },
    { count: 0 }
);

store.use((action, state) => {
    console.log('before action:', action.type, state.count);

    if (action.type === 'increment' && state.count >= 10) {
        return false; // cancel the action
    }

    return action;
});

store.connect((state, action) => {
    console.log('after action:', action.type, state.count);
});
```

### Complete API Reference

| Feature                | TypeScript                                       | JavaScript | HTML Example                     |
| ---------------------- | ------------------------------------------------ | ---------- | -------------------------------- |
| Config                 | UI.config({ prefix: 'app' })                     | Same       | <div app-tabs>                   |
| Hydration              | UI.config({ hydrate: true })                     | Same       | SSR-safe resume mode             |
| Register               | UI.register('tabs', Tabs)                        | Same       | <div ui-tabs>  (default)         |
| Prefix Utility         | getPrefix()                                      | Same       | Dynamic selectors                |
| Init                   | UI.init()                                        | Same       | Auto-finds [prefix-name]         |
| Partial scan           | UI.scan(root)                                    | Same       | Hydration islands / portals      |
| Observe                | UI.observe()                                     | Same       | Dynamic content                  |
| Refs                   | this.refs.toggle                                 | Same       | ref="toggle"                     |
| Directives             | Auto-bound                                       | Auto-bound | @click="select('Home')"          |
| Events                 | this.emit('change', data)                        | Same       | @change="onChange"               |
| Lifecycle              | on/offAll/destroy                                | Same       | Event management                 |
| Auto-init refresh      | `UI.init(root)`                                  | Same       | Nested `[ui-tabs]` mounts        |
| Attribute observation  | `UI.observe()`                                   | Same       | `ui-tabs-active="2"`             |
| Dynamic directives     | Delegated `@click` / `@change`                   | Same       | `@click="next()"`                |
| Root + lazy refs       | `this.refs.panel`                                | Same       | `ref="panel"`                    |
| Option sync            | `instance.syncOptions(nextOptions)`              | Same       | Live `ui-modal-open="true"`      |
| Safe DOM cleanup       | `UI.destroy(root?)`                              | Same       | Explicit cleanup on unmount      |
| Host instance expose   | `el.tabs`, `el.modal`, `el.dropdown`             | Same       | Direct host element access       |
| Store middleware       | `store.use((action, state) => action)`           | Same       | Action pipeline                  |
| Cancelable events      | `this.emit('close', data, { cancelable: true })` | Same       | `event.preventDefault()` support |
| Data API triggers      | `UI.init()` / `UI.observe()`                     | Same       | `data-ui-toggle="modal"`         |
| Data target lookup     | Auto target resolution                           | Same       | `data-target="#settingsModal"`   |
| Global UI bus          | `UI.on('modal:open', fn)` / `UI.emit(...)`       | Same       | Cross-component communication    |
| Functional capsules    | `UI.register('modal', (el, api) => ({ ... }))`   | Same       | Function-based lifecycle         |
| DX upgrade             | `UI.config({ debug: true, warnings: true })`     | Same       | Safer developer workflow         |
| Devtools               | `UI.devtools()` / `window.__TINY_ENGINE__`       | Same       | Inspect runtime internals        |
| Performance metrics    | `UI.devtools().inspect().metrics`                | Same       | Creates, scans, flush timings    |
| Plugin system          | `UI.use(plugin)`                                 | Same       | Third-party engine extensions    |


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
