/**
 * Task Executor - Week 1, Day 4
 * Executes tasks from approved plans with retry logic and error handling
 * Target: <500ms orchestration overhead, 99%+ execution success
 */

import { Task, ExecutionPlan } from './planner.js';
import { AgentType } from './intentRouter.js';
import { getContextStore } from './contextStore.js';
import { getPlanStore } from './persistence/planStore.js';

export interface ExecutorCallbacks {
  onTaskStart?: (taskId: string) => void;
  onTaskComplete?: (taskId: string, data: any) => void;
  onTaskFail?: (taskId: string, error: Error) => void;
}

export interface TaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'partial' | 'skipped';
  output: any;
  error?: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  retryCount: number;
}

export interface ExecutionResult {
  planId: string;
  status: 'completed' | 'partial' | 'failed' | 'cancelled';
  taskResults: TaskResult[];
  totalDurationMs: number;
  successRate: number;
  startTime: Date;
  endTime: Date;
}

export interface ExecutorConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  concurrentTasks?: number;
}

export class TaskExecutor {
  private config: ExecutorConfig;
  private agents: Map<AgentType, any>;
  private executionState: Map<string, 'pending' | 'running' | 'completed' | 'failed'>;
  private taskOutputs: Map<string, any>;
  private cancelledPlans: Set<string>;
  private pausedPlans: Set<string>;

  constructor(config: ExecutorConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      timeoutMs: config.timeoutMs || 60000, // 60s per task
      concurrentTasks: config.concurrentTasks || 3,
      ...config,
    };

    this.agents = new Map();
    this.executionState = new Map();
    this.taskOutputs = new Map();
    this.cancelledPlans = new Set();
    this.pausedPlans = new Set();
  }

  /**
   * Register agent handlers
   */
  registerAgent(agentType: AgentType, handler: any): void {
    this.agents.set(agentType, handler);
  }

  /**
   * Execute an approved plan
   */
  async executePlan(plan: ExecutionPlan, callbacks?: ExecutorCallbacks): Promise<ExecutionResult> {
    const startTime = new Date();
    const taskResults: TaskResult[] = [];

    console.log(`[Executor] Starting plan ${plan.planId} with ${plan.tasks.length} tasks`);

    // Initialize execution state
    this.executionState.clear();
    this.taskOutputs.clear();
    plan.tasks.forEach(t => this.executionState.set(t.id, 'pending'));

    // Initialize shared context
    const ctx = getContextStore();
    ctx.init(plan.planId, { planId: plan.planId, startedAt: startTime.toISOString() });

    try {
      // Parallel execution respecting dependencies
      const tasks = plan.tasks;
      const inDegree = new Map<string, number>();
      const dependents = new Map<string, string[]>();
      const attempted = new Set<string>();
      const ready: Task[] = [];

      for (const t of tasks) {
        inDegree.set(t.id, t.dependencies.length);
        for (const dep of t.dependencies) {
          if (!dependents.has(dep)) dependents.set(dep, []);
          dependents.get(dep)!.push(t.id);
        }
      }
      for (const t of tasks) {
        if ((inDegree.get(t.id) || 0) === 0) ready.push(t);
      }

      let running = 0;
      let aborted = false;
      const maxConc = Math.max(1, this.config.concurrentTasks || 3);

      const scheduleNext = async (): Promise<void> => {
        if (aborted) return;
        // refill while we can
        while (running < maxConc && ready.length > 0 && !aborted) {
          const task = ready.shift()!;
          if (attempted.has(task.id)) continue;
          attempted.add(task.id);
          running++;

          // Notify start
          callbacks?.onTaskStart?.(task.id);
          // Execute
          this.executeTask(task, plan.planId)
            .then((result) => {
              taskResults.push(result);

              if (result.status === 'success') {
                this.taskOutputs.set(task.id, result.output);
                ctx.mergeTaskOutput(plan.planId, task.id, result.output);
                // Checkpoint: save task result to persistent store
                getPlanStore().appendTaskResult(plan.planId, result).catch(err => {
                  console.error(`[Executor] Failed to checkpoint task ${task.id}:`, err);
                });
                callbacks?.onTaskComplete?.(task.id, result.output);
              } else if (result.status === 'failure') {
                // Checkpoint failed task
                getPlanStore().appendTaskResult(plan.planId, result).catch(err => {
                  console.error(`[Executor] Failed to checkpoint task ${task.id}:`, err);
                });
                callbacks?.onTaskFail?.(task.id, new Error(result.error || 'Task failed'));
                if (task.criticalPath) {
                  aborted = true;
                }
              }

              // update dependents readiness
              const deps = dependents.get(task.id) || [];
              for (const depTaskId of deps) {
                const current = inDegree.get(depTaskId)! - 1;
                inDegree.set(depTaskId, current);
                if (current === 0) {
                  const depTask = tasks.find(t => t.id === depTaskId)!;
                  // if plan aborted, still collect remaining as skipped
                  if (!aborted) ready.push(depTask);
                }
              }
            })
            .catch((err) => {
              // Shouldn't occur because executeTask handles errors
              callbacks?.onTaskFail?.(task.id, err);
            })
            .finally(async () => {
              running--;
              if (this.cancelledPlans.has(plan.planId)) {
                aborted = true;
              }
              if (!aborted) await scheduleNext();
            });
        }
      };

      await scheduleNext();

      // Wait for all running tasks to finish
      while (running > 0) {
        await this.sleep(25);
      }

      // If aborted/cancelled, mark remaining as skipped
      if (aborted || this.cancelledPlans.has(plan.planId)) {
        for (const t of tasks) {
          if (!taskResults.find(r => r.taskId === t.id)) {
            taskResults.push(this.createSkippedResult(t));
          }
        }
      }
    } catch (error) {
      console.error('[Executor] Plan execution error:', error);
    }

    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    const successCount = taskResults.filter(r => r.status === 'success').length;
    const successRate = taskResults.length > 0 ? successCount / taskResults.length : 0;

    const status = this.determineExecutionStatus(taskResults, plan);

    return {
      planId: plan.planId,
      status,
      taskResults,
      totalDurationMs,
      successRate,
      startTime,
      endTime,
    };
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(task: Task, planId?: string): Promise<TaskResult> {
    const startTime = new Date();
    let retryCount = 0;
    let lastError: string | undefined;

    console.log(`[Executor] Executing task ${task.id}: ${task.action}`);
    this.executionState.set(task.id, 'running');

    while (retryCount <= (task.retryable ? this.config.maxRetries! : 0)) {
      try {
        // Get agent handler
        const agent = this.agents.get(task.agentType);
        if (!agent) {
          throw new Error(`No handler registered for agent type: ${task.agentType}`);
        }

        // Resolve parameter references (e.g., "task_1_output")
        const resolvedParams = this.resolveParameters(task.parameters, planId);

        // Execute with timeout
        const output = await this.executeWithTimeout(
          () => agent.execute(task.action, resolvedParams),
          this.config.timeoutMs!
        );

        // Success!
        const endTime = new Date();
        this.executionState.set(task.id, 'completed');

        return {
          taskId: task.id,
          status: 'success',
          output,
          startTime,
          endTime,
          durationMs: endTime.getTime() - startTime.getTime(),
          retryCount,
        };
      } catch (error: any) {
        lastError = error.message || String(error);
        console.error(`[Executor] Task ${task.id} attempt ${retryCount + 1} failed:`, lastError);

        retryCount++;
        if (retryCount <= this.config.maxRetries! && task.retryable) {
          // Exponential backoff
          const delay = this.config.retryDelayMs! * Math.pow(2, retryCount - 1);
          console.log(`[Executor] Retrying task ${task.id} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const endTime = new Date();
    this.executionState.set(task.id, 'failed');

    return {
      taskId: task.id,
      status: 'failure',
      output: null,
      error: lastError,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      retryCount: retryCount - 1,
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Resolve parameter references to actual values
   */
  private resolveParameters(params: Record<string, any>, planId?: string): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.endsWith('_output')) {
        // Reference to another task's output
        const taskId = value.replace('_output', '');
        resolved[key] = this.taskOutputs.get(taskId) || value;
      } else if (typeof value === 'string' && value.startsWith('$ctx.')) {
        // Reference into shared context: $ctx.taskId.some.path
        const path = value.substring(5);
        const ctx = getContextStore();
        resolved[key] = planId ? ctx.getPath(planId, path) ?? value : value;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Check if task dependencies succeeded
   */
  private checkDependencies(task: Task, results: TaskResult[]): boolean {
    if (task.dependencies.length === 0) return true;

    for (const depId of task.dependencies) {
      const depResult = results.find(r => r.taskId === depId);
      if (!depResult || depResult.status !== 'success') {
        return false;
      }
    }

    return true;
  }

  /**
   * Create skipped task result
   */
  private createSkippedResult(task: Task): TaskResult {
    const now = new Date();
    return {
      taskId: task.id,
      status: 'skipped',
      output: null,
      startTime: now,
      endTime: now,
      durationMs: 0,
      retryCount: 0,
    };
  }

  /**
   * Determine overall execution status
   */
  private determineExecutionStatus(
    results: TaskResult[],
    plan: ExecutionPlan
  ): 'completed' | 'partial' | 'failed' | 'cancelled' {
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failure').length;
    const criticalTasks = plan.tasks.filter(t => t.criticalPath);
    const criticalFailed = results.some(
      r => r.status === 'failure' && criticalTasks.some(t => t.id === r.taskId)
    );

    if (successCount === plan.tasks.length) return 'completed';
    if (criticalFailed) return 'failed';
    if (failureCount > 0) return 'partial';
    return 'completed';
  }

  /**
   * Get execution order (topological sort)
   */
  private getExecutionOrder(tasks: Task[]): Task[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const taskMap = new Map<string, Task>();

    tasks.forEach(t => {
      taskMap.set(t.id, t);
      graph.set(t.id, t.dependencies);
      inDegree.set(t.id, t.dependencies.length);
    });

    const queue: Task[] = [];
    const result: Task[] = [];

    // Add tasks with no dependencies
    tasks.forEach(t => {
      if (inDegree.get(t.id) === 0) {
        queue.push(t);
      }
    });

    while (queue.length > 0) {
      const task = queue.shift()!;
      result.push(task);

      // Reduce in-degree for dependent tasks
      tasks.forEach(t => {
        if (t.dependencies.includes(task.id)) {
          const degree = inDegree.get(t.id)! - 1;
          inDegree.set(t.id, degree);
          if (degree === 0) {
            queue.push(t);
          }
        }
      });
    }

    return result;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel execution
   */
  async cancelExecution(planId: string): Promise<void> {
    console.log(`[Executor] Cancelling execution for plan ${planId}`);
    this.cancelledPlans.add(planId);
  }

  /**
   * Get execution state for a plan
   */
  getExecutionState(taskId: string): 'pending' | 'running' | 'completed' | 'failed' | undefined {
    return this.executionState.get(taskId);
  }
}

// Export singleton
let executorInstance: TaskExecutor | null = null;

export function getTaskExecutor(config?: ExecutorConfig): TaskExecutor {
  if (!executorInstance) {
    executorInstance = new TaskExecutor(config);
  }
  return executorInstance;
}

export default TaskExecutor;
