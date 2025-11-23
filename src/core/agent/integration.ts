/**
 * Agent Integration - Tier 3 Pillar 1
 * Wire up agent graph, tools, and memory
 */

import { agentTaskGraph } from './graph';
import { toolRegistryV2 } from './tools/v2';
import { executePlanFromGoal } from './planner';
import { log } from '../../utils/logger';

/**
 * Initialize agent system
 */
export function initializeAgentSystem() {
  // Register all v2 tools with the graph
  const tools = toolRegistryV2.getAll();
  tools.forEach(tool => {
    agentTaskGraph.registerTool(tool.name, async (input, ctx) => {
      return toolRegistryV2.execute(tool.name, input, ctx);
    });
  });

  log.info(`[AgentSystem] Initialized with ${tools.length} tools`);
}

/**
 * High-level API: Execute a goal
 */
export async function executeAgentGoal(goal: string): Promise<unknown> {
  return executePlanFromGoal(goal);
}

// Initialize on import
initializeAgentSystem();
