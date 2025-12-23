/**
 * Agent Integration - Tier 3 Pillar 1
 * Wire up agent graph, tools, and memory
 */

import { agentExecutor, type AgentExecutionOptions, type AgentExecutionResult } from './executor';

/**
 * Initialize agent system
 */
export function initializeAgentSystem() {
  agentExecutor.initialize();
}

/**
 * High-level API: Execute a goal
 */
export async function executeAgentGoal(
  goal: string,
  options?: AgentExecutionOptions
): Promise<AgentExecutionResult> {
  return agentExecutor.runGoal(goal, options);
}

export function getAgentAudit(runId: string) {
  return agentExecutor.getAudit(runId);
}

// Initialize on import
initializeAgentSystem();
