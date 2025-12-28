# Changelog
All notable changes to this project will be documented in this file.

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