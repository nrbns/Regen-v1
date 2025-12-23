// consent-ledger.js
// Event-driven consent ledger for sensitive operations (see CONSENT_LEDGER.md)

const fs = require('fs');
const path = require('path');
const LEDGER_PATH = path.resolve(__dirname, '../../userData/consent-ledger.json');
const BACKUP_PATH = path.resolve(__dirname, '../../userData/consent-ledger.backup.json');
const EventEmitter = require('events');

class ConsentLedger extends EventEmitter {
  constructor(eventBus) {
    super();
    this.eventBus = eventBus;
    this.ledger = [];
    this.load();
  }

  load() {
    if (fs.existsSync(LEDGER_PATH)) {
      this.ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    }
  }

  save() {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(this.ledger, null, 2));
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(this.ledger, null, 2));
  }

  addEntry(entry) {
    this.ledger.push(entry);
    this.save();
    this.emit('consent:ledger:updated', entry);
    this.eventBus.emit('consent:ledger:updated', entry);
  }

  verify() {
    // Simple integrity check: all entries have id, timestamp, action, user, decision
    for (let i = 0; i < this.ledger.length; i++) {
      const e = this.ledger[i];
      if (!e.id || !e.timestamp || !e.action || !e.user || typeof e.decision === 'undefined') {
        return { ok: false, badId: i };
      }
    }
    return { ok: true };
  }

  getAll() {
    return this.ledger;
  }
}

module.exports = ConsentLedger;
