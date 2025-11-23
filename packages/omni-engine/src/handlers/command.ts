/**
 * Command Handler
 * Processes AI commands and returns execution plans
 */

import { createLogger } from '../utils/logger';
import { planCommand } from '../planner';
import { executePlan } from '../executor';

const log = createLogger('command-handler');

export interface CommandRequest {
  command: string;
  context?: {
    url?: string;
    html?: string;
    title?: string;
    tabId?: string;
    sessionId?: string;
  };
  mode?: 'research' | 'trade' | 'browser' | 'automation';
  language?: string;
}

export interface CommandResponse {
  success: boolean;
  plan: {
    steps: Array<{
      action: string;
      params: Record<string, unknown>;
      description: string;
    }>;
  };
  result?: unknown;
  error?: string;
}

/**
 * Handle command request
 */
export async function commandHandler(request: CommandRequest): Promise<CommandResponse> {
  log.info('Processing command', { command: request.command, mode: request.mode });

  try {
    // Step 1: Plan the command
    const plan = await planCommand(request.command, {
      context: request.context,
      mode: request.mode || 'browser',
      language: request.language || 'en',
    });

    log.info('Command planned', { steps: plan.steps.length });

    // Step 2: Execute the plan (if requested)
    // In some cases, we might just return the plan for the client to execute
    let result;
    if (request.context?.tabId) {
      // We have browser context, can execute
      result = await executePlan(plan, request.context);
    }

    return {
      success: true,
      plan,
      result,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Command handler failed', { error: err.message, stack: err.stack });
    return {
      success: false,
      error: err.message,
      plan: { steps: [] },
    };
  }
}
