# Realtime Integration Guide

This file explains how to wire the realtime Task Engine and Resource Publisher into your Electron main process and preload script so the renderer receives live task and resource events.

Files added by the integration work:

- `src/core/execution/task.ts` — Task types
- `src/core/execution/eventBus.ts` — EventEmitter-based event bus
- `src/core/execution/taskManager.ts` — Task lifecycle helpers (create/log/stream/complete)
- `src/core/execution/demoAgentRunner.ts` — Demo runner (for testing)
- `src/electron/wireTaskEvents.ts` — Helper to forward `eventBus` events to renderer via `BrowserWindow.webContents.send`
- `src/electron/preload/taskPreload.ts` — Preload `contextBridge` exposing `window.regen` APIs (onTaskCreated, onResource, runDemoAgent, ...)
- `src/electron/mainTaskHandlers.ts` — Registers `ipcMain` handlers and starts resource publisher
- `src/electron/resourcePublisher.ts` — Samples CPU/RAM and emits `resource` events
- `src/components/realtime/*` — `RealtimePanel`, `TaskList`, `StreamingOutput`, `LogPanel`, `ResourceBar`
- `src/ui/store/taskStore.ts` — Minimal renderer-side task store

## Wire into your Electron main (example)

In your Electron main file (where you create `mainWindow`), add the following:

```js
// at top
import { wireTaskEvents } from './src/electron/wireTaskEvents';
import { registerTaskIpcHandlers } from './src/electron/mainTaskHandlers';

// after creating BrowserWindow `mainWindow`
wireTaskEvents(mainWindow);
registerTaskIpcHandlers();
```

This will forward all task events and resource updates to the renderer. The preload script `src/electron/preload/taskPreload.ts` exposes `window.regen` handlers that frontend components already subscribe to.

## Tauri / Non-Electron notes

If you're using Tauri or running purely in the browser, the same UI components will work, but `window.regen` will not be present. In that case you can simulate events via calling the `taskStore` directly from a dev route, or implement equivalent Tauri commands and event forwarding.

## How to test quickly

1. Start your app in Electron mode.
2. Open the Orchestrator Demo page (`/orchestrator-demo`).
3. Click `Run Demo Agent` (this invokes `window.regen.runDemoAgent()` which calls the `runDemoAgent` IPC handler in main).
4. You should see a new task appear in `TaskList`, streaming of output in `StreamingOutput`, logs in `LogPanel`, and `ResourceBar` updating.

If nothing appears, verify:

- `wireTaskEvents(mainWindow)` was called with the correct BrowserWindow instance.
- `registerTaskIpcHandlers()` was called (this also starts the resource publisher).
- Your BrowserWindow `preload` loads `src/electron/preload/taskPreload.ts`.

If you want, I can patch your Electron main entry directly — point me to the file path for your main process (common names: `electron/main.ts`, `electron/index.js`, `src/electron/main.ts`, or similar) and I'll insert the wiring snippet.
