import { ipcMain } from 'electron';
import { runDemoAgent } from '../../core/execution/demoAgentRunner';
import { cancel, tasks } from '../../core/execution/taskManager';
import { startResourcePublisher } from './resourcePublisher';

// Register IPC handlers related to the task engine. Call this from your main process.
export function registerTaskIpcHandlers() {
  ipcMain.handle('run-demo-agent', async () => {
    try {
      const id = await runDemoAgent('Demo: Real-time streaming agent');
      return { ok: true, id };
    } catch (err) {
      console.error('run-demo-agent error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('cancel-task', async (_event, taskId: string) => {
    try {
      const task = tasks.get(taskId);
      if (task) {
        cancel(task);
        return { ok: true };
      } else {
        return { ok: false, error: 'Task not found' };
      }
    } catch (err) {
      console.error('cancel-task error', err);
      return { ok: false, error: String(err) };
    }
  });

  // start resource publisher (dev/main process)
  try {
    startResourcePublisher(1000);
  } catch (e) {
    // ignore
  }
}
