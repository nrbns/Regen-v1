// Regen Voice Control (Phase 3)
// Voice triggers intent, not chat

export type VoiceIntent = 'summarize' | 'remember' | 'pauseAI' | 'custom';

export class VoiceControl {
  private listeners: { [intent: string]: Array<(payload?: any) => void> } = {};

  on(intent: VoiceIntent, handler: (payload?: any) => void) {
    if (!this.listeners[intent]) this.listeners[intent] = [];
    this.listeners[intent].push(handler);
  }

  trigger(intent: VoiceIntent, payload?: any) {
    (this.listeners[intent] || []).forEach((fn: (payload?: any) => void) => fn(payload));
    console.log('[VoiceControl] Triggered intent:', intent, payload);
  }

  // Example: integrate with browser speech recognition
  listen() {
    // Stub: Replace with real speech-to-intent logic
    console.log('[VoiceControl] Listening for voice commands...');
  }
}
