// crash-recovery.js
// Event-driven crash recovery and watchdog for Omnibrowser

const EventEmitter = require('events');

class CrashRecovery extends EventEmitter {
  constructor(eventBus) {
    super();
    this.eventBus = eventBus;
    this.crashLog = [];
    this.setupListeners();
  }

  setupListeners() {
    process.on('uncaughtException', err => {
      this.handleCrash('uncaughtException', err);
    });
    process.on('unhandledRejection', reason => {
      this.handleCrash('unhandledRejection', reason);
    });
    eventBus.on('job:failed', payload => {
      this.handleCrash('job:failed', payload);
    });
  }

  handleCrash(type, error) {
    const entry = {
      type,
      error: error && error.stack ? error.stack : String(error),
      timestamp: Date.now(),
    };
    this.crashLog.push(entry);
    this.emit('crash:detected', entry);
    this.eventBus.emit('crash:detected', entry);
    // Optionally: auto-restart, notify UI, or trigger recovery flows
  }

  getCrashLog() {
    return this.crashLog;
  }
}

module.exports = CrashRecovery;
