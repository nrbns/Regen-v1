/**
 * Command Planner
 * Uses AI to convert natural language commands into execution plans
 */

import { createLogger } from '../utils/logger';

const log = createLogger('planner');

export interface PlanStep {
  action: string;
  params: Record<string, unknown>;
  description: string;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  estimatedDuration?: number;
}

export interface PlanningContext {
  context?: {
    url?: string;
    html?: string;
    title?: string;
  };
  mode?: 'research' | 'trade' | 'browser' | 'automation';
  language?: string;
}

/**
 * Plan a command - converts natural language to execution steps
 */
export async function planCommand(
  command: string,
  context: PlanningContext
): Promise<ExecutionPlan> {
  log.info('Planning command', { command, mode: context.mode });

  // This is where you'd integrate with your AI (OpenAI, Claude, etc.)
  // For now, we'll use a simple rule-based planner
  // In production, this would call your LLM with a prompt like:
  // "Convert this command into a sequence of browser actions: {command}"

  const lower = command.toLowerCase();
  const steps: PlanStep[] = [];

  // Simple intent detection (in production, use LLM)
  if (lower.includes('search') || lower.includes('find')) {
    const query = extractQuery(command);
    steps.push({
      action: 'search',
      params: { query },
      description: `Search for: ${query}`,
    });

    if (lower.includes('open') || lower.includes('top')) {
      const count = extractNumber(command) || 3;
      steps.push({
        action: 'openTabs',
        params: { count },
        description: `Open top ${count} results`,
      });
    }
  } else if (lower.includes('scroll')) {
    const direction = lower.includes('down') ? 'down' : 'up';
    const amount = extractNumber(command) || 500;
    steps.push({
      action: 'scroll',
      params: { direction, amount },
      description: `Scroll ${direction} by ${amount}px`,
    });
  } else if (lower.includes('click') || lower.includes('open')) {
    const target = extractTarget(command);
    steps.push({
      action: 'click',
      params: { target },
      description: `Click: ${target}`,
    });
  } else if (lower.includes('go back') || lower.includes('back')) {
    steps.push({
      action: 'navigate',
      params: { direction: 'back' },
      description: 'Navigate back',
    });
  } else if (lower.includes('book') || lower.includes('buy') || lower.includes('purchase')) {
    // Complex multi-step action
    steps.push({
      action: 'extractIntent',
      params: { command },
      description: 'Extract booking/purchase intent',
    });
    steps.push({
      action: 'fillForm',
      params: { command },
      description: 'Fill booking form',
    });
    steps.push({
      action: 'submit',
      params: {},
      description: 'Submit form',
    });
  }

  // If no steps found, create a generic "understand" step
  if (steps.length === 0) {
    steps.push({
      action: 'understand',
      params: { command },
      description: 'Understand and process command',
    });
  }

  return {
    steps,
    estimatedDuration: steps.length * 2, // Rough estimate in seconds
  };
}

/**
 * Extract search query from command
 */
function extractQuery(command: string): string {
  // Simple extraction - in production, use LLM
  const patterns = [
    /search for (.+?)(?: and|$)/i,
    /find (.+?)(?: and|$)/i,
    /look for (.+?)(?: and|$)/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return command;
}

/**
 * Extract number from command
 */
function extractNumber(command: string): number | null {
  const match = command.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract target element from command
 */
function extractTarget(command: string): string {
  // Simple extraction - in production, use LLM + DOM analysis
  if (command.includes('first')) return 'first';
  if (command.includes('second')) return 'second';
  if (command.includes('third')) return 'third';
  return 'first';
}
