/**
 * Agent Executor - Wrapper that uses queue for unlimited agents
 * This is the main entry point for executing agents
 */

import { agentQueue } from './agentQueue';
import { multiAgentSystem, type AgentContext, type AgentResult } from './multiAgentSystem';
import { modelManager } from '../ai/modelManager';

/**
 * Execute agent with automatic queuing
 * Returns immediately with agent ID, result available via callback or polling
 */
export async function executeAgent(
  query: string,
  context: AgentContext,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<{ agentId: string; result?: AgentResult }> {
  // Initialize model manager if needed
  await modelManager.detectSystemResources();
  await modelManager.getRecommendedModel(); // Initialize model selection

  // Update queue limits based on system resources
  const maxAgents = await modelManager.getMaxConcurrentAgents();
  agentQueue.setMaxParallel(maxAgents);

  // Enqueue agent
  const agentId = await agentQueue.enqueue(query, context.mode, priority);

  // For high-priority agents, wait a bit to see if it starts immediately
  if (priority === 'high') {
    await new Promise(resolve => setTimeout(resolve, 100));
    const status = agentQueue.getStatus();
    if (status.running > 0) {
      // Agent started, can return early
      return { agentId };
    }
  }

  return { agentId };
}

/**
 * Execute agent synchronously (for backwards compatibility)
 * Note: This will queue if at capacity
 */
export async function executeAgentSync(query: string, context: AgentContext): Promise<AgentResult> {
  // Check if we can execute immediately
  const status = agentQueue.getStatus();
  const maxAgents = await modelManager.getMaxConcurrentAgents();

  if (status.running < maxAgents) {
    // Can execute immediately
    return await multiAgentSystem.execute(context.mode, query, context);
  }

  // Queue it and wait
  const { agentId } = await executeAgent(query, context, 'normal');

  // Poll for result (with timeout)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Agent execution timeout'));
    }, 300000); // 5 minute timeout

    const unsubscribe = agentQueue.onUpdate(agent => {
      if (agent.id === agentId) {
        if (agent.status === 'completed') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(agent.result as AgentResult);
        } else if (agent.status === 'failed') {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(agent.error || 'Agent execution failed'));
        }
      }
    });
  });
}

/**
 * Get agent status
 */
export function getAgentStatus(agentId: string) {
  const status = agentQueue.getStatus();
  const queuePosition = agentQueue.getQueuePosition(agentId);
  return {
    ...status,
    queuePosition: queuePosition > 0 ? queuePosition : undefined,
  };
}
