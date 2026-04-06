# Changelog
All notable changes to this project will be documented in this file.

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


