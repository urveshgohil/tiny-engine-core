# Changelog
All notable changes to this project will be documented in this file.

## 1.8.0 (2026-06-10)
```bash
├── DataGrid moved into Core with root and `tiny-engine-core/data-grid` exports
├── Client-side column sorting and stable custom comparators
├── Single and multiple row selection with a current-page header checkbox
├── Optional pagination with previous/next controls and selectable page sizes
├── Search, formatted cells, selection events, and imperative grid APIs
├── SSR-safe ESM/CommonJS imports with lazy MutationObserver creation
├── React and Next.js client-effect integration guidance with hydration cleanup
└── Standalone DataGrid stylesheet at `tiny-engine-core/data-grid/style.css`
```

## 1.7.1 (2026-05-27)
```bash
├── Performance pass for DOM scan, destroy, option sync, and owner refresh paths
├── Reduced temporary array/set allocations in core engine hot paths
├── Faster plugin hook dispatch while preserving async hook error handling
├── Lighter TinyRequest abort flow and request header preparation
└── Faster UID hydration registration without regex parsing
```

## 1.7.0 (2026-05-27)
```bash
├── TinyRequest API client exported as `request` and `TinyRequest`
├── Dependency-free request layer built on native fetch instead of XMLHttpRequest
├── request.get/post/put/patch/delete helpers with automatic JSON request and response handling
├── request.upload() for FormData, Blob/File, and object-based multipart payloads
├── Per-request and default timeout, retry, abort, and cache controls
├── Request, response, and error interceptors for auth headers, transforms, and centralized handling
└── Async-safe plugin hooks plus action/actionComplete/actionError hooks for data API actions
```

## 1.6.0 (2026-05-09)
```bash
├── UI.destroy(root?) for explicit teardown during framework unmounts, HMR, route changes, and micro-frontends
├── UI.scan(root) for manual partial initialization of portals, AJAX blocks, and hydration islands
├── Batched DOM scheduler using microtasks plus animation frames for observer-driven scans and option syncs
├── Hydration mode via UI.config({ hydrate: true }) for SSR-safe resume behavior and no-op option sync skipping
├── Improved lifecycle timing data with devtools performance metrics for creates, destroys, scans, syncs, emits, and flushes
└── Plugin context support for scan() and destroy() so framework adapters can manage mount/unmount boundaries
```

## 1.5.0 (2026-04-12)
```bash
├── DX Upgrade with better TypeScript ergonomics, warnings, debug mode, and clearer APIs
├── Devtools layer for inspecting capsules, props, refs, signals, stores, and emitted events
└── Plugin system with `UI.use(plugin)` style extension architecture for third-party addons
```

## 1.4.0 (2026-04-06)
```bash
├── Middleware support for CapsuleStore with store.use(...) hooks
├── Cancellable component events via emit(..., { cancelable: true })
├── Data API for declarative UI triggers with data-hind-toggle / data-target
├── Global UI event bus with UI.on() / UI.emit() for cross-component sync
├── Lower-boilerplate developer experience for plugins, analytics, and behaviors
├── Performance-focused core flow updates for smoother runtime interactions
└── Dual capsule support for both class-based and functional registration
```

## 1.3.0 (2026-04-04)
```bash
├── Dynamic DOM auto-init improvements (root element + nested matches)
├── Attribute observer support for live ui-* / app-* updates
├── Delegated @directives engine for dynamic HTML actions
├── Better ref handling with root refs + lazy ref lookup
├── Instance sync support for attribute-driven option changes
├── Safe instance cleanup when nodes are removed from the DOM
├── Host element instance exposure (el.modal / el.dropdown / etc.)
└── Core runtime optimization and TypeScript cleanup
```

## 1.2.0 (2025-12-27)
```bash
├── Enhanced Props System (defaults, HTML attrs, model binding)
├── Typed Refs (ref="toggle" → this.refs.toggle: HTMLButtonElement)
├── Full @directives Support (@click="select('Home')" → window.select('Home'))
├── Reactive Props (active="1" → auto onPropChange('active'))
├── PropsChangeListener API ((newVal, oldVal, key) => void)
├── Instance Auto-Expose (el.tabs = instance → easy JS control)
├── Public Methods (setActive(), getActive(), next())
├── Event Emit (this.emit('tabchange', { index }))
├── Enhanced Options Merging (defaults → attrs → directives → options)
├── Improved Timing (requestAnimationFrame() for refs/DOM ready)
└── TypeScript Fixes (HTMLElement typing, PropsChangeListener signature)
```

## 1.1.0 (2025-12-27)
```bash
├──  Dynamic prefix system (UI.config({ prefix }))
├──  getPrefix() utility for components
├──  UIOptions TypeScript interface
├──  Enhanced readOptions(prefix param)
└──  Improved TypeScript declarations
```

## 1.0.0 (2025-12-26)
```bash
└── Initial core release
```


