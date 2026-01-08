import { createTask, start, stream, log, complete, fail, pause, resume } from '../../core/execution/taskManager';
import { detectIntentOnDevice } from './onDeviceAI';
import { agentRuntime } from '../../core/agent/agentRuntime';
import { chooseAgent, getDefaultAgentConfig } from '../../core/agent/agentRouter';
import { buildAgentContext, getCurrentBrowserContext } from '../../core/agent/agentContext';
import { Task } from '../../core/execution/task';

/**
 * Service for creating and managing tasks based on user intents
 */
export class TaskService {
  /**
   * Process user input and create appropriate tasks
   */
  static async processUserInput(input: string): Promise<Task> {
    // Detect intent from user input
    const intent = await this.detectIntent(input);

    // Create task immediately
    const task = createTask(intent);

    // Start processing in background
    this.executeTask(task, input);

    return task;
  }

  /**
   * Detect intent from user input
   */
  private static async detectIntent(input: string): Promise<string> {
    try {
      const detectedIntent = await detectIntentOnDevice(input);
      return `${detectedIntent}: ${input}`;
    } catch (error) {
      console.warn('[TaskService] Intent detection failed, using fallback:', error);
      return `process: ${input}`;
    }
  }

  /**
   * Execute task using the agent runtime system
   */
  private static async executeTask(task: Task, input: string): Promise<void> {
    try {
      start(task);
      log(task, `Starting execution for: ${input}`);

      // Get browser context and build agent context
      const browserContext = getCurrentBrowserContext();
      const agentContext = buildAgentContext(browserContext, task.intent);

      // Choose appropriate agent
      const agentConfig = getDefaultAgentConfig();
      const agent = chooseAgent(agentConfig);

      log(task, `Using agent: ${agentConfig.offline ? 'offline' : 'online'}`);

      // Run agent through runtime (streaming)
      await agentRuntime.runAgent(task, agent);

    } catch (error) {
      fail(task, String(error));
      log(task, `Task failed: ${error}`);
    }
  }


  private static async handleCommandTask(task: Task, command: string): Promise<void> {
    log(task, 'Executing command...');

    await this.delay(200);
    stream(task, `Running: ${command}`);
    await this.delay(800);
    stream(task, 'Command executed successfully');
  }

  private static async handleGenericTask(task: Task, input: string): Promise<void> {
    log(task, 'Processing request...');

    await this.delay(300);
    stream(task, 'Working...');
    await this.delay(1000);
    stream(task, `Processed: ${input}`);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel a running task
   */
  static async cancelTask(taskId: string): Promise<boolean> {
    try {
      const { cancel, tasks } = await import('../../core/execution/taskManager');
      const task = tasks.get(taskId);
      if (task) {
        cancel(task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TaskService] Failed to cancel task:', error);
      return false;
    }
  }

  /**
   * Pause a running task
   */
  static async pauseTask(taskId: string): Promise<boolean> {
    try {
      const { tasks } = await import('../../core/execution/taskManager');
      const task = tasks.get(taskId);
      if (task) {
        pause(task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TaskService] Failed to pause task:', error);
      return false;
    }
  }

  /**
   * Resume a paused task
   */
  static async resumeTask(taskId: string): Promise<boolean> {
    try {
      const { tasks } = await import('../../core/execution/taskManager');
      const task = tasks.get(taskId);
      if (task) {
        resume(task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TaskService] Failed to resume task:', error);
      return false;
    }
  }
}
