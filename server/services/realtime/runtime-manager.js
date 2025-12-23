const CrashRecovery = require('./crash-recovery');
// Initialize crash recovery and listen for crash events
const crashRecovery = new CrashRecovery(eventBus);
eventBus.on('crash:detected', _entry => {
  runtimeState.crashLog = crashRecovery.getCrashLog();
  broadcastRuntimeEvent({ event: 'crash:detected', crash: _entry });
});

// Fix for lint: prefix unused 'entry' in function signature
// (No-op, already fixed above if not used elsewhere)

// server/services/realtime/runtime-manager.js
// Event-driven Runtime Manager: Unifies job, agent, memory, and skill state/events

const eventBus = require('../../eventBus');
const { sendToClient } = require('./websocket-server');
const ExtensionLoader = require('./extension-loader');
const ConsentLedger = require('./consent-ledger');

// In-memory runtime state snapshot
const runtimeState = {
  jobs: {},
  agents: {},
  memory: {},
  skills: {},
  extensions: {},
};
// Initialize extension loader and listen for extension events
const _extensionLoader = new ExtensionLoader(eventBus);
['extension:loaded', 'extension:unloaded', 'extension:error'].forEach(evt => {
  eventBus.on(evt, payload => {
    runtimeState.extensions[payload.name] = payload;
    broadcastRuntimeEvent({ event: evt, extension: payload });
  });
});

// Initialize consent ledger and listen for updates
const consentLedger = new ConsentLedger(eventBus);
eventBus.on('consent:ledger:updated', _entry => {
  runtimeState.consentLedger = consentLedger.getAll();
  broadcastRuntimeEvent({ event: 'consent:ledger:updated', ledger: runtimeState.consentLedger });
});

// Helper: broadcast runtime event to all clients
function broadcastRuntimeEvent(event) {
  sendToClient({
    type: 'runtime:event',
    ...event,
    timestamp: Date.now(),
  });
}

// Listen for job events
[
  'job:created',
  'job:started',
  'job:progress',
  'job:completed',
  'job:failed',
  'job:checkpointed',
  'job:cancelled',
].forEach(evt => {
  eventBus.on(evt, payload => {
    runtimeState.jobs[payload.id] = payload;
    broadcastRuntimeEvent({ event: evt, job: payload });
  });
});

// Listen for agent events (future-proof)
['agent:registered', 'agent:started', 'agent:stopped', 'agent:failed'].forEach(evt => {
  eventBus.on(evt, payload => {
    runtimeState.agents[payload.id] = payload;
    broadcastRuntimeEvent({ event: evt, agent: payload });
  });
});

// Listen for memory events
['memory:changed', 'memory:added', 'memory:removed'].forEach(evt => {
  eventBus.on(evt, payload => {
    runtimeState.memory[payload.path] = payload;
    broadcastRuntimeEvent({ event: evt, memory: payload });
  });
});

// Listen for skill/plugin events (future-proof)
['skill:loaded', 'skill:unloaded', 'skill:failed'].forEach(evt => {
  eventBus.on(evt, payload => {
    runtimeState.skills[payload.id] = payload;
    broadcastRuntimeEvent({ event: evt, skill: payload });
  });
});

// API: get current runtime state snapshot
function getRuntimeState() {
  return JSON.parse(JSON.stringify(runtimeState));
}

module.exports = {
  getRuntimeState,
  runtimeState,
};
