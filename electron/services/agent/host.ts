/**
 * Agent Host Service
 * Long-running service managing agent tasks, budgets, and tool execution
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AgentStore } from './store';
import { registry } from './skills/registry';
import { policyAllows } from './policy';
import { ConsentLedger } from '../consent-ledger';

export type AgentRole = 'researcher' | 'reviewer' | 'scraper' | 'threat-analyst' | 'downloader';

export const AgentTaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  role: z.enum(['researcher', 'reviewer', 'scraper', 'threat-analyst', 'downloader']),
  goal: z.string().min(1), // plain-language objective
  inputs: z.record(z.unknown()).optional(),
  budget: z
    .object({
      tokens: z.number().min(0).default(8192),
      seconds: z.number().min(0).default(300),
      requests: z.number().min(0).default(100),
      downloads: z.number().min(0).default(10),
    })
    .default({}),
  policyProfile: z.enum(['strict', 'balanced', 'open']).default('balanced'),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

export interface AgentObservation {
  url?: string;
  html?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentPlan {
  taskId: string;
  steps: Array<{
    id: string;
    tool: string;
    args: Record<string, unknown>;
    requiresConsent?: boolean;
    reversible?: boolean;
  }>;
  estimatedBudget: {
    tokens: number;
    seconds: number;
    requests: number;
  };
}

export interface AgentStepResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  budgetUsed: {
    tokens: number;
    seconds: number;
  };
}

export class AgentHost {
  private store: AgentStore;
  private ledger: ConsentLedger;
  private activeTasks = new Map<
    string,
    {
      task: AgentTask;
      plan: AgentPlan | null;
      startTime: number;
      budgetUsed: {
        tokens: number;
        seconds: number;
        requests: number;
        downloads: number;
      };
      stepsCompleted: number;
    }
  >();

  constructor(store: AgentStore, ledger: ConsentLedger) {
    this.store = store;
    this.ledger = ledger;
  }

  /**
   * Create a new agent task
   */
  async createTask(task: AgentTask): Promise<string> {
    const taskId = task.id || randomUUID();

    const defaultBudget = {
      tokens: 8192,
      seconds: 300,
      requests: 100,
      downloads: 10,
    };

    const fullTask: AgentTask = {
      ...task,
      id: taskId,
      budget: task.budget ? { ...defaultBudget, ...task.budget } : defaultBudget,
      policyProfile: task.policyProfile || 'balanced',
    };

    this.activeTasks.set(taskId, {
      task: fullTask,
      plan: null,
      startTime: Date.now(),
      budgetUsed: {
        tokens: 0,
        seconds: 0,
        requests: 0,
        downloads: 0,
      },
      stepsCompleted: 0,
    });

    // Store initial task
    this.store.start(taskId, fullTask);

    return taskId;
  }

  /**
   * Generate a plan for a task (simulation mode)
   */
  async generatePlan(taskId: string, observations?: AgentObservation[]): Promise<AgentPlan> {
    const active = this.activeTasks.get(taskId);
    if (!active) {
      throw new Error(`Task ${taskId} not found`);
    }

    // TODO: Integrate with LLM for plan generation
    // For now, return a simple plan based on role
    const steps = this.generateStepsForRole(active.task.role, active.task.goal, observations);

    const plan: AgentPlan = {
      taskId,
      steps,
      estimatedBudget: {
        tokens: steps.length * 1000,
        seconds: steps.length * 5,
        requests: steps.filter(s => s.tool === 'fetch').length,
      },
    };

    active.plan = plan;
    return plan;
  }

  /**
   * Execute a task plan
   */
  async executeTask(
    taskId: string,
    confirmSteps: string[] = [],
    agentId?: string
  ): Promise<AgentStepResult[]> {
    const active = this.activeTasks.get(taskId);
    if (!active || !active.plan) {
      throw new Error(`Task ${taskId} has no plan`);
    }

    // Load agent context if agentId provided
    let agentContext: {
      lastTasks: Array<{ taskId: string; goal: string; completedAt: number; result?: unknown }>;
      ongoingGoals: Array<{ goalId: string; goal: string; startedAt: number; status: string }>;
      preferences: Record<string, unknown>;
      recentHistory: Array<{ timestamp: number; action: string; result?: unknown; error?: string }>;
    } | null = null;

    if (agentId) {
      try {
        const { getContextForRun } = await import('./context-store');
        agentContext = getContextForRun(agentId);
        const log = (await import('../utils/logger')).createLogger('agent-host');
        log.info('Loaded agent context for task', {
          taskId,
          agentId,
          lastTasksCount: agentContext.lastTasks.length,
          ongoingGoalsCount: agentContext.ongoingGoals.length,
        });
      } catch (error) {
        const log = (await import('../utils/logger')).createLogger('agent-host');
        log.warn('Failed to load agent context', { agentId, error });
      }
    }

    const results: AgentStepResult[] = [];

    // Build memory from agent context
    const memory: Record<string, unknown> = {};
    if (agentContext) {
      memory._agentContext = {
        lastTasks: agentContext.lastTasks,
        ongoingGoals: agentContext.ongoingGoals,
        preferences: agentContext.preferences,
        recentHistory: agentContext.recentHistory,
      };
    }

    for (const step of active.plan.steps) {
      // Check budget
      if (!this.checkBudget(active, step)) {
        results.push({
          stepId: step.id,
          success: false,
          error: 'Budget exceeded',
          budgetUsed: active.budgetUsed,
        });
        break;
      }

      // Check consent for sensitive operations
      if (step.requiresConsent && !confirmSteps.includes(step.id)) {
        results.push({
          stepId: step.id,
          success: false,
          error: 'Consent required',
          budgetUsed: active.budgetUsed,
        });
        continue;
      }

      // Check policy
      if (!policyAllows({ skill: step.tool, args: step.args })) {
        results.push({
          stepId: step.id,
          success: false,
          error: 'Policy violation',
          budgetUsed: active.budgetUsed,
        });
        continue;
      }

      // Execute step in sandbox
      try {
        const tool = registry.get(step.tool);
        if (!tool) {
          throw new Error(`Tool ${step.tool} not found`);
        }

        const execStartTime = performance.now();

        // Execute tool with timeout protection (8 seconds)
        // Inject agent context into memory for tool execution
        const output = (await Promise.race([
          tool.exec({ runId: taskId, memory }, step.args),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tool execution timeout after 8s')), 8000)
          ),
        ])) as unknown;

        const execTime = (performance.now() - execStartTime) / 1000;

        // Record agent execution metric
        try {
          const { recordMetric } = await import('../../../server/metrics.js');
          recordMetric('agentExecution', execTime * 1000); // Convert to ms
        } catch {
          // Metrics module not available, continue
        }

        // Update budget
        active.budgetUsed.tokens += 100; // Estimate
        active.budgetUsed.seconds += execTime;
        if (step.tool === 'fetch') active.budgetUsed.requests += 1;

        active.stepsCompleted += 1;

        results.push({
          stepId: step.id,
          success: true,
          output,
          budgetUsed: {
            tokens: active.budgetUsed.tokens,
            seconds: active.budgetUsed.seconds,
          },
        });

        this.store.append(taskId, { step: step.id, tool: step.tool, result: output });
      } catch (error) {
        results.push({
          stepId: step.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          budgetUsed: active.budgetUsed,
        });
        this.store.append(taskId, { step: step.id, tool: step.tool, error: String(error) });
      }
    }

    this.store.finish(taskId);

    // Save task result to agent context if agentId provided
    if (agentId && active) {
      try {
        const { recordTaskResult, updateOngoingGoal } = await import('./context-store');
        const goal = active.task.goal || 'Unknown goal';
        const success = results.every(r => r.success);
        const lastResult = results[results.length - 1];

        recordTaskResult(
          agentId,
          taskId,
          goal,
          success ? lastResult?.output : undefined,
          success ? undefined : lastResult?.error
        );

        // If this was an ongoing goal, mark it as completed
        if (success && agentContext?.ongoingGoals.length) {
          const matchingGoal = agentContext.ongoingGoals.find(
            (g: { goalId: string; goal: string; startedAt: number; status: string }) =>
              g.goal.toLowerCase().includes(goal.toLowerCase()) ||
              goal.toLowerCase().includes(g.goal.toLowerCase())
          );
          if (matchingGoal) {
            updateOngoingGoal(agentId, matchingGoal.goalId, matchingGoal.goal, 'completed');
          }
        }
      } catch (error) {
        const log = (await import('../utils/logger')).createLogger('agent-host');
        log.warn('Failed to save task result to agent context', { agentId, taskId, error });
      }
    }

    return results;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const active = this.activeTasks.get(taskId);
    if (active) {
      // Terminate any sandbox workers for this task
      try {
        const { agentSandbox } = await import('./sandbox-runner');
        agentSandbox.terminateWorker(taskId);
        // Also terminate any step-specific workers
        for (let i = 0; i < active.stepsCompleted; i++) {
          agentSandbox.terminateWorker(`${taskId}-${i}`);
        }
      } catch (error) {
        // Sandbox cleanup failed, continue with task cancellation
        console.warn('[AgentHost] Failed to cleanup sandbox workers:', error);
      }

      this.store.finish(taskId);
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string) {
    const active = this.activeTasks.get(taskId);
    if (!active) return null;

    return {
      taskId,
      status: active.plan ? 'ready' : 'planning',
      budgetUsed: active.budgetUsed,
      budgetRemaining: {
        tokens: active.task.budget.tokens - active.budgetUsed.tokens,
        seconds: active.task.budget.seconds - active.budgetUsed.seconds,
        requests: active.task.budget.requests - active.budgetUsed.requests,
        downloads: active.task.budget.downloads - active.budgetUsed.downloads,
      },
      stepsCompleted: active.stepsCompleted,
      totalSteps: active.plan?.steps.length || 0,
    };
  }

  private checkBudget(
    active: { task: AgentTask; budgetUsed: any },
    step: AgentPlan['steps'][0]
  ): boolean {
    const budget = active.task.budget;
    const used = active.budgetUsed;

    if (used.tokens >= budget.tokens) return false;
    if (used.seconds >= budget.seconds) return false;
    if (used.requests >= budget.requests && step.tool === 'fetch') return false;
    if (used.downloads >= budget.downloads && step.tool === 'download') return false;

    return true;
  }

  private generateStepsForRole(
    role: AgentRole,
    goal: string,
    observations?: AgentObservation[]
  ): AgentPlan['steps'] {
    // Simple step generation based on role
    // In production, this would use LLM planning
    const steps: AgentPlan['steps'] = [];

    switch (role) {
      case 'researcher':
        steps.push({
          id: randomUUID(),
          tool: 'fetch',
          args: { url: observations?.[0]?.url || '' },
        });
        steps.push({ id: randomUUID(), tool: 'extract', args: {} });
        steps.push({ id: randomUUID(), tool: 'summarize', args: { text: '' } });
        break;
      case 'scraper':
        steps.push({
          id: randomUUID(),
          tool: 'navigate',
          args: { url: observations?.[0]?.url || '' },
        });
        steps.push({ id: randomUUID(), tool: 'extract_table', args: { selector: '' } });
        steps.push({
          id: randomUUID(),
          tool: 'export_csv',
          args: { filename: 'output.csv' },
          requiresConsent: true,
        });
        break;
      case 'downloader':
        steps.push({
          id: randomUUID(),
          tool: 'fetch',
          args: { url: observations?.[0]?.url || '' },
        });
        steps.push({
          id: randomUUID(),
          tool: 'download',
          args: { url: observations?.[0]?.url || '' },
          requiresConsent: true,
        });
        break;
    }

    return steps;
  }
}
