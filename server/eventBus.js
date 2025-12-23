// Central Event Bus for Regen Backend (Node.js)
const { EventEmitter } = require('events');
const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);
module.exports = eventBus;
