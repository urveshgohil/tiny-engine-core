import { UI, Capsule, CapsuleStore } from './dist/tiny-engine.esm.js';

const pluginLogEl = document.getElementById('pluginLog');
const devtoolsOutputEl = document.getElementById('devtoolsOutput');

const appendLog = (message) => {
    const item = document.createElement('li');
    item.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
    pluginLogEl.prepend(item);

    while (pluginLogEl.children.length > 8) {
        pluginLogEl.removeChild(pluginLogEl.lastElementChild);
    }
};

UI.config({
    prefix: 'app',
    debug: true,
    warnings: true
});

const counterStore = new CapsuleStore((state, action) => {
    switch (action.type) {
        case 'increment':
            return { ...state, count: state.count + 1 };
        case 'decrement':
            return { ...state, count: state.count - 1 };
        case 'reset':
            return { ...state, count: 0 };
        default:
            return state;
    }
}, { count: 0 });

counterStore.use((action, state) => {
    appendLog(`middleware -> ${action.type} (count: ${state.count})`);
    return action;
});

class CounterCapsule extends Capsule {
    constructor(el, options = {}) {
        super(el, options);
        this.handleClick = this.handleClick.bind(this);
        this.on(this.el, 'click', this.handleClick);
        this.connectStore(counterStore, (state, action) => {
            this.render(state.count, action.type);
            UI.emit('counter:change', { count: state.count, action: action.type });
        });
    }

    handleClick(event) {
        const button = event.target.closest('[data-counter-action]');
        if (!button) {
            return;
        }

        counterStore.send({ type: button.getAttribute('data-counter-action') });
    }

    render(count, action = 'sync') {
        if (this.refs.value) {
            this.refs.value.textContent = String(count);
        }

        if (this.refs.meta) {
            this.refs.meta.textContent = `Last action: ${action}`;
        }
    }
}

UI.register('counter', CounterCapsule);

UI.register('devpanel', (el, api) => {
    const stateLabel = () => el.querySelector('[ref="stateLabel"]');

    const render = (open) => {
        api.props.open = open;
        el.dataset.state = open ? 'open' : 'closed';
        const label = stateLabel();
        if (label) {
            label.textContent = open ? 'open' : 'closed';
        }

        UI.emit('devpanel:change', { open, id: api.uid });
    };

    return {
        open() {
            render(true);
        },
        close() {
            const event = api.emit('devpanel:beforeclose', null, { cancelable: true });
            if (event.defaultPrevented) {
                return false;
            }

            render(false);
            return true;
        },
        toggle() {
            if (api.props.open) {
                return this.close();
            }

            this.open();
            return true;
        },
        syncOptions(nextOptions) {
            render(Boolean(nextOptions.open));
        },
        destroy() {
            delete el.dataset.state;
        }
    };
});

const devtoolsPlugin = {
    name: 'demo-devtools-plugin',
    version: '1.0.0',
    install(ui) {
        ui.debug('Installing DX demo plugin');
        let didLogDocumentInit = false;

        const offInit = ui.hook('init', ({ root }) => {
            const isTopLevelRoot =
                root === document ||
                root === document.documentElement;

            if (!isTopLevelRoot || didLogDocumentInit) {
                return;
            }

            didLogDocumentInit = true;
            appendLog('plugin:init -> document');
        });

        const offCreate = ui.hook('create', ({ name, el }) => {
            appendLog(`plugin:create -> ${name} on <${el.tagName.toLowerCase()}>`);
        });

        const offEmit = ui.hook('emit', ({ eventName }) => {
            appendLog(`plugin:emit -> ${eventName}`);
        });

        ui.expose('tinyEngineDemoPlugin', {
            ping() {
                ui.emit('plugin:ping', { source: 'tinyEngineDemoPlugin' });
                appendLog('plugin:ping -> exposed helper fired');
            }
        });

        return () => {
            offInit();
            offCreate();
            offEmit();
        };
    }
};

UI.use(devtoolsPlugin);
UI.init();

const summarizeValue = (value) => {
    if (value == null) {
        return value;
    }

    if (value instanceof HTMLElement) {
        return {
            element: value.tagName.toLowerCase(),
            id: value.id || null
        };
    }

    if (Array.isArray(value)) {
        return value.slice(0, 6).map(summarizeValue);
    }

    if (typeof value === 'object') {
        if ('uid' in value && 'el' in value) {
            return {
                capsule: value.constructor?.name || 'Capsule',
                uid: value.uid
            };
        }

        const output = {};
        for (const [key, entry] of Object.entries(value).slice(0, 10)) {
            output[key] = summarizeValue(entry);
        }
        return output;
    }

    return value;
};

const renderDevtools = () => {
    const snapshot = UI.devtools().inspect();
    const safeSnapshot = {
        version: snapshot.version,
        config: snapshot.config,
        registry: snapshot.registry,
        plugins: snapshot.plugins,
        stores: snapshot.stores,
        instances: snapshot.instances.map((entry) => ({
            uid: entry.uid,
            name: entry.name,
            refNames: entry.refNames,
            options: summarizeValue(entry.options)
        })),
        events: snapshot.events.slice(-8).map((entry) => ({
            type: entry.type,
            timestamp: entry.timestamp,
            payload: summarizeValue(entry.payload)
        })),
        warnings: snapshot.warnings.map((entry) => ({
            message: entry.message,
            timestamp: entry.timestamp,
            detail: summarizeValue(entry.detail)
        }))
    };

    try {
        devtoolsOutputEl.textContent = JSON.stringify(safeSnapshot, null, 2);
    } catch (error) {
        devtoolsOutputEl.textContent = `Unable to render devtools snapshot.\n${String(error)}`;
    }
};

document.getElementById('refreshDevtools').addEventListener('click', renderDevtools);
document.getElementById('inspectGlobal').addEventListener('click', () => {
    console.log('window.__TINY_ENGINE__', window.__TINY_ENGINE__);
    renderDevtools();
});
document.getElementById('pluginPing').addEventListener('click', () => {
    window.tinyEngineDemoPlugin?.ping();
    renderDevtools();
});
document.getElementById('clearEvents').addEventListener('click', () => {
    UI.devtools().clearEvents();
    appendLog('devtools:clearEvents -> event buffer cleared');
    renderDevtools();
});

UI.on('counter:change', () => renderDevtools());
UI.on('devpanel:change', () => renderDevtools());
UI.on('plugin:ping', () => renderDevtools());

requestAnimationFrame(renderDevtools);
