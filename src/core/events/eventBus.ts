/**
 * Real-Time Event Bus - Regen-v1 Core Nervous System
 * 
 * Event-driven architecture for real-time browser intelligence.
 * 90% UI reaction, 10% AI thinking.
 */

export type RegenEvent =
  | { type: "TAB_OPEN"; payload?: any }
  | { type: "TAB_CLOSE"; payload?: any }
  | { type: "URL_CHANGE"; payload?: string }
  | { type: "SCROLL_END" }
  | { type: "IDLE"; payload?: number }
  | { type: "AVATAR_INVOKE" }
  | { type: "COMMAND"; payload: string };

type Listener = (event: RegenEvent) => void;

class EventBus {
  private listeners: Listener[] = [];
  
  emit(e: RegenEvent): void {
    // Process all listeners synchronously for real-time reactivity
    // Use forEach for performance (no array copying)
    for (let i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i](e);
      } catch (error) {
        console.error(`[EventBus] Handler error:`, error);
      }
    }
  }
  
  subscribe(l: Listener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter(x => x !== l);
    };
  }
}

export const regenEventBus = new EventBus();