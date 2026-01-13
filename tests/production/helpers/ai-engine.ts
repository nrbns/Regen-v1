/**
 * AI Engine test helpers
 */

import { eventBus } from '../../../src/core/state/eventBus';

export class AITestHelper {
  private aiEnabled: boolean = true;

  async disableAI(): Promise<void> {
    this.aiEnabled = false;
    // Emit event to disable AI
    eventBus.emit('ai:disabled');
  }

  async enableAI(): Promise<void> {
    this.aiEnabled = true;
    // Emit event to enable AI
    eventBus.emit('ai:enabled');
  }

  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  async simulateAIFailure(): Promise<void> {
    // Simulate AI API failure
    eventBus.emit('ai:error', { error: 'API_FAILURE' });
  }

  async simulateAISlow(delayMs: number = 5000): Promise<void> {
    // Simulate slow AI response
    await new Promise(resolve => setTimeout(resolve, delayMs));
    eventBus.emit('ai:slow', { delay: delayMs });
  }

  async simulateAIQuotaExceeded(): Promise<void> {
    // Simulate quota exceeded
    eventBus.emit('ai:error', { error: 'QUOTA_EXCEEDED' });
  }

  async killAITask(): Promise<void> {
    // Simulate killing AI mid-task
    eventBus.emit('ai:task:cancelled');
  }
}
