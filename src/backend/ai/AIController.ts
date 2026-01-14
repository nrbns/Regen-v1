import { systemState } from '../state/SystemState';

export class AIController {
  private static isInitialized = false;

  static async initialize() {
    try {
      // Check if AI service is available via Tauri
      await (globalThis as any).__TAURI__.invoke('ai_check_status');
      systemState.setAIAvailable(true);
      this.isInitialized = true;
      console.log('[AIController] AI service initialized and available');
    } catch (error) {
      console.warn('[AIController] AI service not available:', error);
      systemState.setAIAvailable(false);
      this.isInitialized = false;
      // Don't throw - AI is optional
    }
  }

  static async runTask(task: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AI not initialized');
    }

    systemState.setAIRunning(true, task);

    try {
      // Call Tauri AI command for completion
      const result = await (globalThis as any).__TAURI__.invoke('ai_complete', {
        prompt: task
      });

      console.log('[AIController] AI task completed:', result.substring(0, 100) + '...');
      return result;
    } catch (error) {
      console.error('[AIController] AI task failed:', error);
      systemState.setError('AI task failed');
      throw error;
    } finally {
      systemState.setAIRunning(false);
    }
  }

  static async detectIntent(query: string): Promise<string> {
    if (!this.isInitialized) {
      return this.fallbackIntentDetection(query);
    }
    const tauriInvoke = (globalThis as any).__TAURI__?.invoke;
    if (typeof tauriInvoke !== 'function') {
      return this.fallbackIntentDetection(query);
    }
    try {
      // Call Tauri AI command for intent detection
      const intent = await tauriInvoke('ai_detect_intent', {
        query
      });
      return intent;
    } catch (error) {
      console.error('[AIController] Intent detection failed:', error);
      // Fallback to basic intent detection
      return this.fallbackIntentDetection(query);
    }
  }

  private static fallbackIntentDetection(query: string): string {
    const trimmed = query.toLowerCase().trim();

    if (trimmed.includes('?') || trimmed.match(/^(what|how|why|when|where|who|which)/)) {
      return 'ai';
    }

    if (trimmed.includes('http') || trimmed.includes('.com') || trimmed.includes('.org')) {
      return 'navigate';
    }

    return 'search';
  }

  static isAvailable(): boolean {
    return systemState.getState().ai.available;
  }

  static isRunning(): boolean {
    return systemState.getState().ai.running;
  }
}
