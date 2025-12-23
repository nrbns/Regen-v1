// extension-loader.js
// Event-driven extension/plugin loader for Omnibrowser
// Loads, validates, and sandboxes extensions in real-time. Emits events to the event bus.

const path = require('path');
const fs = require('fs');
const _vm = require('vm');
const EventEmitter = require('events');

const SecuritySandbox = require('./security-sandbox');
const EXTENSIONS_DIR = path.resolve(__dirname, '../../extensions');

class ExtensionLoader extends EventEmitter {
  constructor(eventBus) {
    super();
    this.eventBus = eventBus;
    this.extensions = new Map();
    this.sandbox = new SecuritySandbox(eventBus);
    this.loadAllExtensions();
    this.watchExtensions();
  }

  loadAllExtensions() {
    if (!fs.existsSync(EXTENSIONS_DIR)) return;
    const files = fs.readdirSync(EXTENSIONS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
      this.loadExtension(file);
    }
  }

  loadExtension(filename) {
    const extPath = path.join(EXTENSIONS_DIR, filename);
    try {
      const code = fs.readFileSync(extPath, 'utf8');
      const context = { module: {}, exports: {}, require, eventBus: this.eventBus };
      this.sandbox.runExtension(code, context, { filename: extPath, timeout: 2000 });
      const ext = context.module.exports || context.exports;
      if (typeof ext.init === 'function') {
        ext.init(this.eventBus);
      }
      this.extensions.set(filename, ext);
      this.emit('extension:loaded', { name: filename });
      this.eventBus.emit('extension:loaded', { name: filename });
    } catch (err) {
      this.emit('extension:error', { name: filename, error: err });
      this.eventBus.emit('extension:error', { name: filename, error: err });
    }
  }

  unloadExtension(filename) {
    if (this.extensions.has(filename)) {
      const ext = this.extensions.get(filename);
      if (typeof ext.unload === 'function') {
        ext.unload(this.eventBus);
      }
      this.extensions.delete(filename);
      this.emit('extension:unloaded', { name: filename });
      this.eventBus.emit('extension:unloaded', { name: filename });
    }
  }

  watchExtensions() {
    if (!fs.existsSync(EXTENSIONS_DIR)) return;
    fs.watch(EXTENSIONS_DIR, (eventType, filename) => {
      if (!filename.endsWith('.js')) return;
      if (eventType === 'rename') {
        if (fs.existsSync(path.join(EXTENSIONS_DIR, filename))) {
          this.loadExtension(filename);
        } else {
          this.unloadExtension(filename);
        }
      } else if (eventType === 'change') {
        this.unloadExtension(filename);
        this.loadExtension(filename);
      }
    });
  }
}

module.exports = ExtensionLoader;
