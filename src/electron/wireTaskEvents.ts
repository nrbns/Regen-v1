import { eventBus } from '../../core/execution/eventBus';

// Tauri-compatible event forwarding
// Call this from your main process to wire task events to Tauri frontend
export function wireTaskEvents() {
  eventBus.on('task:created', (task) => {
    try {
      // In Tauri, emit events to frontend
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('task:created', task);
      }
    } catch (e) {
      console.warn('Failed to emit task:created event:', e);
    }
  });

  eventBus.on('task:updated', (task) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('task:updated', task);
      }
    } catch (e) {
      console.warn('Failed to emit task:updated event:', e);
    }
  });

  eventBus.on('task:log', (payload) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('task:log', payload);
      }
    } catch (e) {
      console.warn('Failed to emit task:log event:', e);
    }
  });

  eventBus.on('task:status-changed', (payload) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('task:status-changed', payload);
      }
    } catch (e) {
      console.warn('Failed to emit task:status-changed event:', e);
    }
  });

  eventBus.on('tasks:cleaned', (payload) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('tasks:cleaned', payload);
      }
    } catch (e) {
      console.warn('Failed to emit tasks:cleaned event:', e);
    }
  });

  // forward resource updates
  eventBus.on('resource', (payload) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.event.emit('resource:update', payload);
      }
    } catch (e) {
      console.warn('Failed to emit resource:update event:', e);
    }
  });
}
