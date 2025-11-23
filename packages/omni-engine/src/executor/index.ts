/**
 * Plan Executor
 * Executes planned actions (can be called by Electron, Brave, or any client)
 */

import { createLogger } from '../utils/logger';
import type { ExecutionPlan, PlanStep } from '../planner';

const log = createLogger('executor');

export interface ExecutionContext {
  url?: string;
  html?: string;
  title?: string;
  tabId?: string;
  sessionId?: string;
}

export interface ExecutionResult {
  success: boolean;
  results: Array<{
    step: PlanStep;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
}

/**
 * Execute a plan
 * Returns structured results that can be used by any client (Electron, Brave, etc.)
 */
export async function executePlan(
  plan: ExecutionPlan,
  context: ExecutionContext
): Promise<ExecutionResult> {
  log.info('Executing plan', { steps: plan.steps.length, context: context.url });

  const results: ExecutionResult['results'] = [];

  for (const step of plan.steps) {
    try {
      log.info('Executing step', { action: step.action, description: step.description });

      // Execute step based on action type
      const result = await executeStep(step, context);

      results.push({
        step,
        success: true,
        result,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Step execution failed', { step: step.action, error: err.message });

      results.push({
        step,
        success: false,
        error: err.message,
      });

      // Optionally stop on first error
      // break;
    }
  }

  const allSuccess = results.every(r => r.success);

  return {
    success: allSuccess,
    results,
  };
}

/**
 * Execute a single step
 */
async function executeStep(step: PlanStep, _context: ExecutionContext): Promise<unknown> {
  switch (step.action) {
    case 'search':
      // Return search results (client will handle display)
      return {
        type: 'search',
        query: step.params.query,
        results: [], // Would be populated by actual search
      };

    case 'openTabs':
      // Return URLs to open (client will handle opening)
      return {
        type: 'openTabs',
        urls: [], // Would be populated by search results
        count: step.params.count,
      };

    case 'scroll':
      // Return scroll instruction (client will execute)
      return {
        type: 'scroll',
        direction: step.params.direction,
        amount: step.params.amount,
      };

    case 'click':
      // Return click instruction (client will execute)
      return {
        type: 'click',
        target: step.params.target,
      };

    case 'navigate':
      // Return navigation instruction
      return {
        type: 'navigate',
        direction: step.params.direction,
      };

    case 'fillForm':
      // Return form fill instruction
      return {
        type: 'fillForm',
        data: step.params.command,
      };

    case 'submit':
      // Return submit instruction
      return {
        type: 'submit',
      };

    default:
      // Generic action
      return {
        type: 'generic',
        action: step.action,
        params: step.params,
      };
  }
}
