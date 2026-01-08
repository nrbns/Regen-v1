// Tauri-compatible preload for task events
// Exposes minimal, safe APIs to renderer for task events

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

if (isTauri) {
  const { invoke, event } = (window as any).__TAURI__;

  // Expose APIs to global window
  (window as any).regen = {
    onTaskCreated: (cb: (task: any) => void) => {
      const unlisten = event.listen('task:created', (event: any) => cb(event.payload));
      return unlisten;
    },
    onTaskUpdated: (cb: (task: any) => void) => {
      const unlisten = event.listen('task:updated', (event: any) => cb(event.payload));
      return unlisten;
    },
    onTaskLog: (cb: (payload: any) => void) => {
      const unlisten = event.listen('task:log', (event: any) => cb(event.payload));
      return unlisten;
    },
    onTaskStatusChanged: (cb: (payload: any) => void) => {
      const unlisten = event.listen('task:status-changed', (event: any) => cb(event.payload));
      return unlisten;
    },
    runDemoAgent: () => invoke('run-demo-agent'),
    onResource: (cb: (payload: any) => void) => {
      const unlisten = event.listen('resource:update', (event: any) => cb(event.payload));
      return unlisten;
    },
    cancelTask: (taskId: string) => invoke('cancel-task', taskId),
  };
} else {
  // Fallback for non-Tauri environments (web mode)
  console.warn('Tauri not available - task APIs will be no-ops');

  (window as any).regen = {
    onTaskCreated: () => {},
    onTaskUpdated: () => {},
    onTaskLog: () => {},
    onTaskStatusChanged: () => {},
    runDemoAgent: () => Promise.resolve({ ok: false, error: 'Not in Tauri environment' }),
    onResource: () => {},
    cancelTask: () => Promise.resolve({ ok: false, error: 'Not in Tauri environment' }),
  };
}
