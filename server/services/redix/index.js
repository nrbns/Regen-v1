/**
 * Redix SuperCore - Main Entry Point
 * The execution engine for OmniBrowser
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const eventBus = require('./event-bus');
const commandQueue = require('./command-queue');
const sessionStore = require('./session-store');
const workflowOrchestrator = require('./workflow-orchestrator');
const automationTriggers = require('./automation-triggers');
const failSafe = require('./fail-safe');

module.exports = {
  // Event Bus
  eventBus,

  // Command Queue
  commandQueue,

  // Session Store
  sessionStore,

  // Workflow Orchestrator
  workflowOrchestrator,

  // Automation Triggers
  automationTriggers,

  // Fail-Safe
  failSafe,
};
