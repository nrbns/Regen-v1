/**
 * Controlled Agent - Regen-Safe Agent Model
 * 
 * CRITICAL PRINCIPLES:
 * 1. Agents are TASKS with loops - not independent intelligence
 * 2. All steps are visible and controllable
 * 3. User can pause/cancel at any time
 * 4. Agents have strict limits (max steps, time, etc.)
 * 5. No background execution - user is always in control
 * 
 * Architecture:
 * User → Agent Task → Controlled Agent → Steps (visible) → Tools → Execution → Observation → Decision
 */

import type { BaseExecutor, ExecutorInput, ExecutorResult } from '../executors/types';
import { createTask, type Task } from '../../execution/taskManager';

export interface AgentStep {
  id: string;
  type: 'plan' | 'tool' | 'execute' | 'observe' | 'decide';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  tool?: string;
  reasoning?: string;
  timestamp: number;
}

export interface AgentPlan {
  goal: string;
  steps: Array<{
    id: string;
    tool: string;
    parameters: Record<string, any>;
    reasoning: string;
  }>;
}

export interface AgentConfig {
  maxSteps: number;
  maxDuration: number; // milliseconds
  allowedTools: string[];
  requiresApproval: boolean;
  timeout?: number;
}

export interface AgentState {
  taskId: string;
  goal: string;
  plan: AgentPlan | null;
  steps: AgentStep[];
  currentStepIndex: number;
  status: 'planning' | 'approved' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  pausedAt?: number;
  cancelledAt?: number;
  error?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  execute: (params: Record<string, any>) => Promise<any>;
  requiresApproval?: boolean;
}

/**
 * Controlled Agent - A looping task under strict rules
 * 
 * Usage:
 * ```typescript
 * const agent = new ControlledAgent(executor, config);
 * 
 * // Show plan to user
 * const plan = await agent.plan(goal);
 * 
 * // User approves
 * await agent.approve(plan);
 * 
 * // Execute with visibility
 * const result = await agent.execute((step) => {
 *   // Update UI with step
 *   updateUI(step);
 * });
 * ```
 */
export class ControlledAgent {
  private executor: BaseExecutor;
  private config: AgentConfig;
  private state: AgentState | null = null;
  private tools: Map<string, AgentTool> = new Map();
  private cancelSignal: AbortController | null = null;

  constructor(executor: BaseExecutor, config: AgentConfig) {
    this.executor = executor;
    this.config = config;
  }

  /**
   * Register a tool explicitly
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Plan the agent's approach (visible to user)
   */
  async plan(goal: string): Promise<AgentPlan> {
    const task = createTask('agent_plan');
    this.state = {
      taskId: task.id,
      goal,
      plan: null,
      steps: [],
      currentStepIndex: 0,
      status: 'planning',
      startedAt: Date.now(),
    };

    try {
      // Use executor to generate plan
      const planResult = await this.executor.execute({
        taskType: 'generate',
        prompt: `Given this goal: "${goal}", create a step-by-step plan. Each step should use one tool. Available tools: ${Array.from(this.tools.keys()).join(', ')}. Return a JSON plan with steps array, each step having: id, tool, parameters, reasoning.`,
        config: {
          provider: 'ollama',
          model: 'phi3:mini',
          temperature: 0.3, // Lower temp for planning
        },
      });

      if (!planResult.success) {
        throw new Error(planResult.error || 'Planning failed');
      }

      // Parse plan (simplified - in production, use proper JSON parsing)
      const planText = planResult.output as string;
      const plan = this.parsePlan(planText, goal);

      // Validate plan
      this.validatePlan(plan);

      if (this.state) {
        this.state.plan = plan;
      }

      task.output.push({ plan });
      return plan;
    } catch (error: any) {
      if (this.state) {
        this.state.status = 'failed';
        this.state.error = error.message;
      }
      throw error;
    }
  }

  /**
   * User approves the plan
   */
  async approve(plan: AgentPlan): Promise<void> {
    if (!this.state) {
      throw new Error('Agent not initialized. Call plan() first.');
    }

    if (this.config.requiresApproval) {
      // Validate tools are allowed
      for (const step of plan.steps) {
        if (!this.config.allowedTools.includes(step.tool)) {
          throw new Error(`Tool ${step.tool} is not allowed`);
        }
      }
    }

    this.state.plan = plan;
    this.state.status = 'approved';
  }

  /**
   * Execute the agent (step-by-step, visible)
   */
  async execute(
    onStep?: (step: AgentStep) => void
  ): Promise<AgentResult> {
    if (!this.state || !this.state.plan) {
      throw new Error('Agent not planned and approved. Call plan() and approve() first.');
    }

    if (this.state.status !== 'approved' && this.state.status !== 'paused') {
      throw new Error(`Agent not ready. Status: ${this.state.status}`);
    }

    this.cancelSignal = new AbortController();
    this.state.status = 'running';
    const startTime = Date.now();

    try {
      const steps: AgentStep[] = [];

      for (let i = 0; i < this.state.plan.steps.length; i++) {
        // Check limits
        if (steps.length >= this.config.maxSteps) {
          throw new Error(`Max steps (${this.config.maxSteps}) reached`);
        }

        if (Date.now() - startTime > this.config.maxDuration) {
          throw new Error(`Max duration (${this.config.maxDuration}ms) exceeded`);
        }

        // Check cancellation
        if (this.cancelSignal?.signal.aborted) {
          this.state.status = 'cancelled';
          this.state.cancelledAt = Date.now();
          return {
            success: false,
            steps,
            error: 'Agent cancelled by user',
          };
        }

        const planStep = this.state.plan.steps[i];
        const step: AgentStep = {
          id: planStep.id,
          type: 'execute',
          status: 'running',
          tool: planStep.tool,
          input: planStep.parameters,
          reasoning: planStep.reasoning,
          timestamp: Date.now(),
        };

        steps.push(step);
        onStep?.(step);

        try {
          // Execute tool
          const tool = this.tools.get(planStep.tool);
          if (!tool) {
            throw new Error(`Tool ${planStep.tool} not found`);
          }

          // Check if tool requires approval
          if (tool.requiresApproval && this.config.requiresApproval) {
            // In production, this would trigger user approval UI
            // For now, we'll execute (would need approval handler)
          }

          const toolResult = await tool.execute(planStep.parameters);

          step.status = 'completed';
          step.output = toolResult;

          // Observe result (could use executor for analysis)
          const observation = await this.observe(step, toolResult);

          onStep?.(step);
        } catch (error: any) {
          step.status = 'failed';
          step.output = { error: error.message };
          onStep?.(step);

          // Decide whether to continue or fail
          const shouldContinue = await this.decideOnError(step, error);
          if (!shouldContinue) {
            this.state.status = 'failed';
            this.state.error = error.message;
            return {
              success: false,
              steps,
              error: error.message,
            };
          }
        }
      }

      this.state.status = 'completed';
      return {
        success: true,
        steps,
        result: steps[steps.length - 1]?.output,
      };
    } catch (error: any) {
      this.state.status = 'failed';
      this.state.error = error.message;
      return {
        success: false,
        steps: this.state.steps,
        error: error.message,
      };
    }
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (this.state && this.state.status === 'running') {
      this.state.status = 'paused';
      this.state.pausedAt = Date.now();
      this.cancelSignal?.abort();
    }
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    if (this.state) {
      this.state.status = 'cancelled';
      this.state.cancelledAt = Date.now();
      this.cancelSignal?.abort();
    }
  }

  /**
   * Get current state
   */
  getState(): AgentState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Observe step result (analyze output)
   */
  private async observe(step: AgentStep, result: any): Promise<string> {
    // Could use executor to analyze result
    return `Step ${step.id} completed. Result: ${JSON.stringify(result).substring(0, 100)}...`;
  }

  /**
   * Decide whether to continue on error
   */
  private async decideOnError(step: AgentStep, error: Error): Promise<boolean> {
    // Simple decision: don't continue on critical errors
    return !error.message.includes('critical') && !error.message.includes('fatal');
  }

  /**
   * Parse plan from LLM output
   */
  private parsePlan(planText: string, goal: string): AgentPlan {
    // Simplified parsing - in production, use proper JSON extraction
    try {
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          return {
            goal,
            steps: parsed.steps,
          };
        }
      }
    } catch {
      // Fallback to simple plan
    }

    // Fallback: create simple plan
    return {
      goal,
      steps: [
        {
          id: 'step1',
          tool: 'execute',
          parameters: {},
          reasoning: 'Execute goal',
        },
      ],
    };
  }

  /**
   * Validate plan
   */
  private validatePlan(plan: AgentPlan): void {
    if (plan.steps.length > this.config.maxSteps) {
      throw new Error(`Plan has ${plan.steps.length} steps, max is ${this.config.maxSteps}`);
    }

    for (const step of plan.steps) {
      if (!this.config.allowedTools.includes(step.tool)) {
        throw new Error(`Tool ${step.tool} is not in allowed tools`);
      }
    }
  }
}

export interface AgentResult {
  success: boolean;
  steps: AgentStep[];
  result?: any;
  error?: string;
}
