import { OfflineAgent } from '../ai/offline/offlineAgent';

// Create offline agent instance
const offlineAgent = new OfflineAgent();

/**
 * Agent Router - Chooses the right agent based on context and preferences
 */

export interface AgentConfig {
  offline: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

import { AgentContext } from './agentContext';

export interface Agent {
  run(context: AgentContext): AsyncIterable<string>;
}

/**
 * Route to the appropriate agent based on configuration
 */
export function chooseAgent(config: AgentConfig): Agent {
  if (config.offline) {
    return offlineAgent;
  }

  // For now, fall back to offline agent
  // In future: return onlineAgent for cloud models
  return offlineAgent;
}

/**
 * Get default agent configuration based on user preferences
 */
export function getDefaultAgentConfig(): AgentConfig {
  // In a real implementation, this would read from user settings
  // For now, default to offline for privacy
  return {
    offline: true,
    model: 'qwen-2.5-1.5b',
    temperature: 0.7,
    maxTokens: 512,
  };
}

/**
 * Check if agent is available
 */
export function isAgentAvailable(config: AgentConfig): boolean {
  if (config.offline) {
    return offlineAgent.isReady();
  }

  // For online agents, would check API keys, connectivity, etc.
  return false;
}
