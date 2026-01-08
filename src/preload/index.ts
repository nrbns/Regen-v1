// IPC Bridge for Regen UI ↔ Backend Communication
// This exposes safe methods to the renderer process

// Mock implementation for development/web environment
const createMockIPC = () => ({
  onTaskCreated: (callback: (task: any) => void) => {
    // Mock: emit a test task after 2 seconds
    const timeoutId = setTimeout(() => {
      callback({
        id: 'mock-task-1',
        intent: 'Mock AI task',
        status: 'completed',
        model: 'local',
        createdAt: Date.now()
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  },

  onTaskUpdated: (callback: (task: any) => void) => {
    // Mock: no updates in dev
    return () => {};
  },

  onTaskLog: (callback: (log: any) => void) => {
    // Mock: emit a test log after 3 seconds
    const timeoutId = setTimeout(() => {
      callback({
        taskId: 'mock-task-1',
        message: 'Mock AI processing completed',
        level: 'info',
        timestamp: Date.now()
      });
    }, 3000);

    return () => clearTimeout(timeoutId);
  },

  onThoughtStep: (callback: (step: any) => void) => {
    // Mock: emit thought steps
    const steps = [
      { taskId: 'mock-task-1', step: { type: 'thinking', content: 'Analyzing request...', timestamp: Date.now() }},
      { taskId: 'mock-task-1', step: { type: 'processing', content: 'Generating response...', timestamp: Date.now() + 1000 }},
      { taskId: 'mock-task-1', step: { type: 'complete', content: 'Response ready', timestamp: Date.now() + 2000 }}
    ];

    const timeouts: NodeJS.Timeout[] = [];
    steps.forEach((step, index) => {
      const timeoutId = setTimeout(() => callback(step), (index + 1) * 1000);
      timeouts.push(timeoutId);
    });

    return () => timeouts.forEach(clearTimeout);
  },

  onSystemMetrics: (callback: (metrics: any) => void) => {
    // Mock: emit system metrics every 2 seconds
    const intervalId = setInterval(() => {
      callback({
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 40) + 20,
        network: true,
        activeModel: 'local'
      });
    }, 2000);

    return () => clearInterval(intervalId);
  }
});

// Check if we're in Tauri/Electron environment
const isTauriEnv = typeof window !== 'undefined' && window.__TAURI__;

if (isTauriEnv) {
  // Use real Tauri IPC
  import('electron').then(({ contextBridge, ipcRenderer }) => {
    contextBridge.exposeInMainWorld('regen', {
      onTaskCreated: (callback: (task: any) => void) => {
        const handler = (_event: any, task: any) => callback(task);
        ipcRenderer.on('task:created', handler);
        return () => ipcRenderer.removeListener('task:created', handler);
      },

      onTaskUpdated: (callback: (task: any) => void) => {
        const handler = (_event: any, task: any) => callback(task);
        ipcRenderer.on('task:updated', handler);
        return () => ipcRenderer.removeListener('task:updated', handler);
      },

      onTaskLog: (callback: (log: any) => void) => {
        const handler = (_event: any, log: any) => callback(log);
        ipcRenderer.on('task:log', handler);
        return () => ipcRenderer.removeListener('task:log', handler);
      },

      onThoughtStep: (callback: (step: any) => void) => {
        const handler = (_event: any, step: any) => callback(step);
        ipcRenderer.on('thought:step', handler);
        return () => ipcRenderer.removeListener('thought:step', handler);
      },

      onSystemMetrics: (callback: (metrics: any) => void) => {
        const handler = (_event: any, metrics: any) => callback(metrics);
        ipcRenderer.on('system:metrics', handler);
        return () => ipcRenderer.removeListener('system:metrics', handler);
      }
    });
  }).catch(() => {
    // Fallback to mock if electron import fails
    (window as any).regen = createMockIPC();
  });
} else {
  // Use mock IPC for web development
  (window as any).regen = createMockIPC();
}

// Type declarations
declare global {
  interface Window {
    regen: {
      onTaskCreated: (callback: (task: any) => void) => () => void;
      onTaskUpdated: (callback: (task: any) => void) => () => void;
      onTaskLog: (callback: (log: any) => void) => () => void;
      onThoughtStep: (callback: (step: any) => void) => () => void;
      onSystemMetrics: (callback: (metrics: any) => void) => () => void;
    };
  }
}
