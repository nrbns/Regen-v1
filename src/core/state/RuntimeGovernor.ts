// RuntimeGovernor.ts
// Event-driven runtime governor for battery/RAM management
// Features: AI kill, automation pause, throttle indexing

import { eventBus } from './eventBus';

export class RuntimeGovernor {
  private aiKilled = false;
  private automationPaused = false;
  private indexingThrottled = false;

  constructor() {
    // Listen to system resource events
    eventBus.on('system:battery:low', () => {
      this.killAI();
      this.pauseAutomation();
      this.throttleIndexing();
    });
    eventBus.on('system:ram:low', () => {
      this.killAI();
      this.pauseAutomation();
      this.throttleIndexing();
    });
    eventBus.on('system:battery:ok', () => {
      this.resumeAI();
      this.resumeAutomation();
      this.unthrottleIndexing();
    });
    eventBus.on('system:ram:ok', () => {
      this.resumeAI();
      this.resumeAutomation();
      this.unthrottleIndexing();
    });
  }

  killAI() {
    if (!this.aiKilled) {
      this.aiKilled = true;
      eventBus.emit('governor:ai:kill');
    }
  }
  resumeAI() {
    if (this.aiKilled) {
      this.aiKilled = false;
      eventBus.emit('governor:ai:resume');
    }
  }
  pauseAutomation() {
    if (!this.automationPaused) {
      this.automationPaused = true;
      eventBus.emit('governor:automation:pause');
    }
  }
  resumeAutomation() {
    if (this.automationPaused) {
      this.automationPaused = false;
      eventBus.emit('governor:automation:resume');
    }
  }
  throttleIndexing() {
    if (!this.indexingThrottled) {
      this.indexingThrottled = true;
      eventBus.emit('governor:indexing:throttle');
    }
  }
  unthrottleIndexing() {
    if (this.indexingThrottled) {
      this.indexingThrottled = false;
      eventBus.emit('governor:indexing:unthrottle');
    }
  }
}

export const runtimeGovernor = new RuntimeGovernor();
