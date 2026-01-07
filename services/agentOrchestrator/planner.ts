/**
 * Task Planner - Week 1, Day 2
 * Creates execution plans (DAGs) from classified intents
 * Target: <5s plan generation, dependency resolution
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentType, IntentClassification } from './intentRouter.js';

export interface Task {
  id: string;
  agentType: AgentType;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[]; // Task IDs this task depends on
  estimatedDuration: number; // seconds
  retryable: boolean;
  criticalPath: boolean;
}

export interface ExecutionPlan {
  planId: string;
  userId: string;
  intent: IntentClassification;
  tasks: Task[];
  totalEstimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  createdAt: Date;
}

export interface PlannerConfig {
  anthropicApiKey?: string;
  model?: string;
  maxTasks?: number;
  maxDuration?: number; // max plan duration in seconds
}

export class TaskPlanner {
  private client: Anthropic | null = null;
  private config: PlannerConfig;
  private readonly SYSTEM_PROMPT = `You are a task planning system. Break down user intents into executable task DAGs.

Rules:
1. Each task must have clear action + parameters
2. Identify dependencies between tasks
3. Mark critical path tasks
4. Estimate duration realistically
5. Flag high-risk operations (payments, deletions, external APIs)

Respond with JSON:
{
  "tasks": [
    {
      "id": "task_1",
      "agentType": "research",
      "action": "web_search",
      "parameters": {"query": "..."},
      "dependencies": [],
      "estimatedDuration": 5,
      "retryable": true,
      "criticalPath": true
    }
  ],
  "riskLevel": "low|medium|high",
  "requiresApproval": true
}`;

  constructor(config: PlannerConfig = {}) {
    this.config = {
      model: config.model || 'claude-haiku-4.5',
      maxTasks: config.maxTasks || 20,
      maxDuration: config.maxDuration || 300, // 5 minutes
      ...config,
    };

    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Generate execution plan from intent
   */
  async createPlan(
    intent: IntentClassification,
    userId: string,
    context?: Record<string, any>
  ): Promise<ExecutionPlan> {
    const startTime = Date.now();

    try {
      // Try template-based planning first (fast path)
      const templatePlan = this.createTemplatedPlan(intent, userId);
      if (templatePlan) {
        console.log(`[Planner] Template plan in ${Date.now() - startTime}ms`);
        return templatePlan;
      }

      // Use Claude for complex planning
      if (this.client) {
        const plan = await this.createPlanWithClaude(intent, userId, context);
        console.log(`[Planner] Claude plan in ${Date.now() - startTime}ms`);
        return plan;
      }

      // Fallback to simple single-task plan
      return this.createSimplePlan(intent, userId);
    } catch (error) {
      console.error('[Planner] Plan creation error:', error);
      return this.createSimplePlan(intent, userId);
    }
  }

  /**
   * Template-based planning for common patterns
   */
  private createTemplatedPlan(intent: IntentClassification, userId: string): ExecutionPlan | null {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Email sending template
    if (intent.primaryAgent === 'mail' && intent.intent === 'send_email') {
      return {
        planId,
        userId,
        intent,
        tasks: [
          {
            id: 'task_1',
            agentType: 'mail',
            action: 'compose_email',
            parameters: intent.parameters,
            dependencies: [],
            estimatedDuration: 3,
            retryable: true,
            criticalPath: true,
          },
          {
            id: 'task_2',
            agentType: 'mail',
            action: 'send_email',
            parameters: { draftId: 'task_1_output' },
            dependencies: ['task_1'],
            estimatedDuration: 2,
            retryable: true,
            criticalPath: true,
          },
        ],
        totalEstimatedDuration: 5,
        riskLevel: 'medium',
        requiresApproval: true,
        createdAt: new Date(),
      };
    }

    // Research template
    if (intent.primaryAgent === 'research' && intent.intent === 'web_search') {
      return {
        planId,
        userId,
        intent,
        tasks: [
          {
            id: 'task_1',
            agentType: 'research',
            action: 'search',
            parameters: intent.parameters,
            dependencies: [],
            estimatedDuration: 5,
            retryable: true,
            criticalPath: true,
          },
          {
            id: 'task_2',
            agentType: 'research',
            action: 'summarize',
            parameters: { searchResults: 'task_1_output' },
            dependencies: ['task_1'],
            estimatedDuration: 3,
            retryable: true,
            criticalPath: false,
          },
        ],
        totalEstimatedDuration: 8,
        riskLevel: 'low',
        requiresApproval: false,
        createdAt: new Date(),
      };
    }

    // Presentation creation template
    if (intent.primaryAgent === 'ppt' && intent.intent === 'create_presentation') {
      return {
        planId,
        userId,
        intent,
        tasks: [
          {
            id: 'task_1',
            agentType: 'research',
            action: 'gather_content',
            parameters: { topic: intent.parameters.topic },
            dependencies: [],
            estimatedDuration: 10,
            retryable: true,
            criticalPath: true,
          },
          {
            id: 'task_2',
            agentType: 'ppt',
            action: 'generate_outline',
            parameters: { content: 'task_1_output' },
            dependencies: ['task_1'],
            estimatedDuration: 5,
            retryable: true,
            criticalPath: true,
          },
          {
            id: 'task_3',
            agentType: 'ppt',
            action: 'create_slides',
            parameters: { outline: 'task_2_output' },
            dependencies: ['task_2'],
            estimatedDuration: 15,
            retryable: true,
            criticalPath: true,
          },
        ],
        totalEstimatedDuration: 30,
        riskLevel: 'low',
        requiresApproval: true,
        createdAt: new Date(),
      };
    }

    // Booking template
    if (intent.primaryAgent === 'booking') {
      return {
        planId,
        userId,
        intent,
        tasks: [
          {
            id: 'task_1',
            agentType: 'booking',
            action: 'search_options',
            parameters: intent.parameters,
            dependencies: [],
            estimatedDuration: 8,
            retryable: true,
            criticalPath: true,
          },
          {
            id: 'task_2',
            agentType: 'booking',
            action: 'compare_and_select',
            parameters: { options: 'task_1_output' },
            dependencies: ['task_1'],
            estimatedDuration: 3,
            retryable: false,
            criticalPath: true,
          },
          {
            id: 'task_3',
            agentType: 'booking',
            action: 'complete_booking',
            parameters: { selection: 'task_2_output' },
            dependencies: ['task_2'],
            estimatedDuration: 5,
            retryable: false,
            criticalPath: true,
          },
        ],
        totalEstimatedDuration: 16,
        riskLevel: 'high',
        requiresApproval: true,
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Claude-based planning for complex scenarios
   */
  private async createPlanWithClaude(
    intent: IntentClassification,
    userId: string,
    context?: Record<string, any>
  ): Promise<ExecutionPlan> {
    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    const userMessage = `Create an execution plan for:
Intent: ${intent.intent}
Agent: ${intent.primaryAgent}
Parameters: ${JSON.stringify(intent.parameters)}
${context ? `Context: ${JSON.stringify(context)}` : ''}`;

    const message = await this.client.messages.create({
      model: this.config.model!,
      max_tokens: 2000,
      system: this.SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const planData = JSON.parse(jsonMatch[0]);

    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalDuration = planData.tasks.reduce(
      (sum: number, t: Task) => sum + t.estimatedDuration,
      0
    );

    return {
      planId,
      userId,
      intent,
      tasks: planData.tasks,
      totalEstimatedDuration: totalDuration,
      riskLevel: planData.riskLevel || 'medium',
      requiresApproval: planData.requiresApproval !== false,
      createdAt: new Date(),
    };
  }

  /**
   * Simple fallback plan (single task)
   */
  private createSimplePlan(intent: IntentClassification, userId: string): ExecutionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      planId,
      userId,
      intent,
      tasks: [
        {
          id: 'task_1',
          agentType: intent.primaryAgent,
          action: intent.intent,
          parameters: intent.parameters,
          dependencies: [],
          estimatedDuration: 10,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 10,
      riskLevel: 'medium',
      requiresApproval: true,
      createdAt: new Date(),
    };
  }

  /**
   * Validate plan (check for cycles, validate dependencies)
   */
  validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const taskIds = new Set(plan.tasks.map(t => t.id));

    // Check for missing dependencies
    for (const task of plan.tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          errors.push(`Task ${task.id} depends on non-existent task ${depId}`);
        }
      }
    }

    // Check for cycles (simple DFS)
    const hasCycle = this.detectCycle(plan.tasks);
    if (hasCycle) {
      errors.push('Plan contains circular dependencies');
    }

    // Check duration limits
    if (plan.totalEstimatedDuration > this.config.maxDuration!) {
      errors.push(
        `Plan duration ${plan.totalEstimatedDuration}s exceeds limit ${this.config.maxDuration}s`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Detect cycles in task DAG
   */
  private detectCycle(tasks: Task[]): boolean {
    const graph = new Map<string, string[]>();
    tasks.forEach(t => graph.set(t.id, t.dependencies));

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const deps = graph.get(taskId) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (recStack.has(dep)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const taskId of graph.keys()) {
      if (!visited.has(taskId)) {
        if (dfs(taskId)) return true;
      }
    }

    return false;
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(plan: ExecutionPlan): Task[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    plan.tasks.forEach(t => {
      graph.set(t.id, t.dependencies);
      inDegree.set(t.id, t.dependencies.length);
    });

    const queue: Task[] = [];
    const result: Task[] = [];

    // Add tasks with no dependencies
    plan.tasks.forEach(t => {
      if (inDegree.get(t.id) === 0) {
        queue.push(t);
      }
    });

    while (queue.length > 0) {
      const task = queue.shift()!;
      result.push(task);

      // Reduce in-degree for dependent tasks
      plan.tasks.forEach(t => {
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
}

// Export singleton
let plannerInstance: TaskPlanner | null = null;

export function getTaskPlanner(config?: PlannerConfig): TaskPlanner {
  if (!plannerInstance) {
    plannerInstance = new TaskPlanner(config);
  }
  return plannerInstance;
}

export default TaskPlanner;
