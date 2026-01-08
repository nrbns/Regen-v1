import { stream, log, complete, fail } from "../execution/taskManager";
import { Task } from "../execution/task";
import { Agent, AgentContext } from "./agentRouter";
import { getCurrentBrowserContext, buildAgentContext } from "./agentContext";

/**
 * Agent Runtime - The heart of Regen's real-time execution
 * Runs agents with streaming output and full lifecycle management
 */
export class AgentRuntime {
  private runningTasks = new Set<string>();

  /**
   * Execute an agent for a given task
   */
  async runAgent(task: Task, agent: Agent) {
    if (this.runningTasks.has(task.id)) {
      throw new Error('Task already running');
    }

    this.runningTasks.add(task.id);
    log(task, `Agent runtime started for: ${task.intent}`);

    try {
      task.status = "RUNNING";

      // Build agent context from current browser state
      const browserContext = getCurrentBrowserContext();
      const agentContext = buildAgentContext(browserContext, task.intent);

      // Run the agent with the context
      const agentIterator = agent.run(agentContext);

      // Stream each step from the agent
      for await (const step of agentIterator) {
        // Check if task was cancelled during execution
        if (!this.runningTasks.has(task.id)) {
          log(task, 'Agent execution cancelled by user');
          return;
        }

        stream(task, step);
      }

      log(task, 'Agent execution completed successfully');
      complete(task);

    } catch (error) {
      log(task, `Agent execution failed: ${error}`);
      fail(task, String(error));
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * Cancel a running agent
   */
  cancelAgent(taskId: string): boolean {
    if (this.runningTasks.has(taskId)) {
      this.runningTasks.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Check if task is currently running
   */
  isRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }

  /**
   * Get count of running tasks
   */
  getRunningCount(): number {
    return this.runningTasks.size;
  }
}

// Global runtime instance
export const agentRuntime = new AgentRuntime();
