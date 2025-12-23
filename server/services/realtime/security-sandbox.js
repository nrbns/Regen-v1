// security-sandbox.js
// Event-driven security sandbox for Omnibrowser extensions

const vm = require('vm');

class SecuritySandbox {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  runExtension(code, context = {}, options = {}) {
    // Restrict available globals
    const sandbox = {
      ...context,
      console,
      setTimeout,
      clearTimeout,
      Buffer,
      // No access to process, fs, network, etc.
    };
    vm.createContext(sandbox);
    try {
      const result = vm.runInContext(code, sandbox, {
        timeout: options.timeout || 2000,
        filename: options.filename || 'extension-sandboxed.js',
      });
      this.eventBus.emit('sandbox:success', { filename: options.filename });
      return result;
    } catch (err) {
      this.eventBus.emit('sandbox:error', { filename: options.filename, error: err });
      throw err;
    }
  }
}

module.exports = SecuritySandbox;
