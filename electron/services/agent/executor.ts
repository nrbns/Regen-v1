/**
 * Plan Executor - Executes plans with error handling and rollback
 */

import { Plan, PlanStep } from './planner';
import { registry } from './skills/registry';

export interface ExecutionContext {
  runId: string;
  plan: Plan;
  memory: Record<string, unknown>;
  stepResults: Map<string, unknown>;
  currentStep: number;
}

export interface ExecutionResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  results: Array<{ stepId: string; action: string; result?: unknown; error?: string }>;
  finalOutput?: unknown;
}

export class PlanExecutor {
  /**
   * Execute a plan
   */
  async execute(
    plan: Plan,
    runId: string,
    onStepComplete?: (stepId: string, result: unknown) => void
  ): Promise<ExecutionResult> {
    const context: ExecutionContext = {
      runId,
      plan,
      memory: {},
      stepResults: new Map(),
      currentStep: 0,
    };

    const results: ExecutionResult['results'] = [];
    let completedSteps = 0;

    try {
      // Execute steps in order (respecting dependencies)
      const executionOrder = this.topologicalSort(plan.steps);

      for (const step of executionOrder) {
        try {
          // Check dependencies
          if (step.dependsOn) {
            for (const depId of step.dependsOn) {
              if (!context.stepResults.has(depId)) {
                throw new Error(`Dependency ${depId} not completed`);
              }
              // Add dependency result to memory
              context.memory[`step_${depId}`] = context.stepResults.get(depId);
            }
          }

          // Execute step with timeout protection
          const skill = registry.get(step.action);
          if (!skill) {
            throw new Error(`Unknown action: ${step.action}`);
          }

          // Wrap execution with timeout
          const result = (await Promise.race([
            skill.exec({ runId: context.runId, memory: context.memory }, step.args),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Step execution timeout')), 8000)
            ),
          ])) as unknown;

          // Store result
          context.stepResults.set(step.id, result);
          context.memory[`step_${step.id}`] = result;
          context.memory['last'] = result;
          context.currentStep++;

          results.push({
            stepId: step.id,
            action: step.action,
            result,
          });

          completedSteps++;
          onStepComplete?.(step.id, result);
        } catch (error) {
          // Step failed
          results.push({
            stepId: step.id,
            action: step.action,
            error: error instanceof Error ? error.message : String(error),
          });

          // Decide: continue or stop?
          // For now, stop on error (can be made configurable)
          break;
        }
      }

      // Get final output (last step result)
      const finalStep = executionOrder[executionOrder.length - 1];
      const finalOutput = context.stepResults.get(finalStep.id);

      return {
        success: completedSteps === plan.steps.length,
        completedSteps,
        totalSteps: plan.steps.length,
        results,
        finalOutput,
      };
    } catch {
      return {
        success: false,
        completedSteps,
        totalSteps: plan.steps.length,
        results,
        finalOutput: undefined,
      };
    }
  }

  /**
   * Topological sort of steps based on dependencies
   */
  private topologicalSort(steps: PlanStep[]): PlanStep[] {
    const sorted: PlanStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: PlanStep) => {
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected: ${step.id}`);
      }
      if (visited.has(step.id)) {
        return;
      }

      visiting.add(step.id);

      // Visit dependencies first
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          const depStep = steps.find(s => s.id === depId);
          if (depStep) {
            visit(depStep);
          }
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        visit(step);
      }
    }

    return sorted;
  }

  /**
   * Rollback plan execution (cleanup failed steps)
   */
  async rollback(context: ExecutionContext, failedStepId: string): Promise<void> {
    // Find failed step
    const failedStep = context.plan.steps.find(s => s.id === failedStepId);
    if (!failedStep) {
      return;
    }

    // Cleanup logic (e.g., close browsers, delete temp files)
    // This is a placeholder - implement based on specific needs
    console.log(`[PlanExecutor] Rolling back from step ${failedStepId}`);
  }
}

// Singleton instance
let executorInstance: PlanExecutor | null = null;

export function getPlanExecutor(): PlanExecutor {
  if (!executorInstance) {
    executorInstance = new PlanExecutor();
  }
  return executorInstance;
}
