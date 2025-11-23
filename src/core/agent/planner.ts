/**
 * Agent Planner - Tier 3 Pillar 1
 * Convert natural language goals into executable plans
 */

import { agentTaskGraph } from './graph';
import { agentMemory } from './memory';
import type { AgentPlan, AgentNode } from './graph';
import { log } from '../../utils/logger';

/**
 * Plan a multi-step task from a goal
 */
export async function planFromGoal(goal: string): Promise<AgentPlan> {
  log.info(`[AgentPlanner] Planning for goal: ${goal}`);

  // Simple heuristic-based planner (can be replaced with LLM later)
  const goalLower = goal.toLowerCase();

  // Example: "Research 5 best AI browsers, compare features, give table, save as workspace"
  if (goalLower.includes('research') && goalLower.includes('compare')) {
    return createResearchComparePlan(goal);
  }

  // Example: "Summarize this page"
  if (goalLower.includes('summarize') || goalLower.includes('explain')) {
    return createSummaryPlan(goal);
  }

  // Example: "Extract key dates from this document"
  if (goalLower.includes('extract') && goalLower.includes('date')) {
    return createExtractDatesPlan(goal);
  }

  // Default: simple single-step plan
  return createSimplePlan(goal);
}

/**
 * Create a research and compare plan
 */
function createResearchComparePlan(goal: string): AgentPlan {
  const nodes: AgentNode[] = [
    {
      id: 'search',
      tool: 'search_web',
      input: {
        query: extractQuery(goal),
        maxResults: 5,
      },
    },
    {
      id: 'scrape',
      tool: 'scrape_page',
      input: {},
      inputFrom: ['search'], // Get URLs from search results
    },
    {
      id: 'extract',
      tool: 'extract_table',
      input: {},
      inputFrom: ['scrape'],
    },
    {
      id: 'summarize',
      tool: 'summarize_text',
      input: {
        format: 'bullet',
      },
      inputFrom: ['extract'],
    },
    {
      id: 'save',
      tool: 'manage_workspaces',
      input: {
        action: 'create',
        name: `Research: ${extractQuery(goal)}`,
      },
      inputFrom: ['scrape'],
    },
  ];

  return agentTaskGraph.createPlan(goal, nodes);
}

/**
 * Create a summary plan
 */
function createSummaryPlan(goal: string): AgentPlan {
  const nodes: AgentNode[] = [
    {
      id: 'scrape',
      tool: 'scrape_page',
      input: {
        url: extractUrl(goal) || 'current_page',
      },
    },
    {
      id: 'summarize',
      tool: 'summarize_text',
      input: {
        format: agentMemory.getPreferences()['preferred_summary_format'] || 'paragraph',
      },
      inputFrom: ['scrape'],
    },
  ];

  return agentTaskGraph.createPlan(goal, nodes);
}

/**
 * Create an extract dates plan
 */
function createExtractDatesPlan(goal: string): AgentPlan {
  const nodes: AgentNode[] = [
    {
      id: 'scrape',
      tool: 'scrape_page',
      input: {
        url: extractUrl(goal) || 'current_page',
      },
    },
    {
      id: 'extract',
      tool: 'extract_table',
      input: {},
      inputFrom: ['scrape'],
    },
  ];

  return agentTaskGraph.createPlan(goal, nodes);
}

/**
 * Create a simple single-step plan
 */
function createSimplePlan(goal: string): AgentPlan {
  // Try to infer the tool from the goal
  let tool = 'search_web';
  if (goal.toLowerCase().includes('summarize') || goal.toLowerCase().includes('explain')) {
    tool = 'summarize_text';
  } else if (goal.toLowerCase().includes('scrape') || goal.toLowerCase().includes('read')) {
    tool = 'scrape_page';
  }

  const nodes: AgentNode[] = [
    {
      id: 'execute',
      tool,
      input: {
        query: goal,
      },
    },
  ];

  return agentTaskGraph.createPlan(goal, nodes);
}

/**
 * Extract query from goal
 */
function extractQuery(goal: string): string {
  // Simple extraction - can be enhanced with NLP
  const match = goal.match(/research\s+(.+?)(?:\s+and|$)/i);
  if (match) return match[1].trim();
  return goal;
}

/**
 * Extract URL from goal
 */
function extractUrl(goal: string): string | null {
  const urlMatch = goal.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Execute a plan from a goal (high-level API)
 */
export async function executePlanFromGoal(goal: string): Promise<unknown> {
  const plan = await planFromGoal(goal);
  const result = await agentTaskGraph.runPlan(plan, agentMemory);

  if (!result.success) {
    throw new Error(result.error || 'Plan execution failed');
  }

  return result.finalOutput;
}
