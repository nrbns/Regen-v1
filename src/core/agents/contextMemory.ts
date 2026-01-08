/**
 * Agent Context Memory
 * Phase 2, Day 5: Agent Memory - Last 5 turns, context-aware responses
 */

import { useAgentMemoryStore } from '../../state/agentMemoryStore';
import { aiEngine } from '../ai';

export interface ConversationTurn {
  id: string;
  agentId: string;
  userQuery: string;
  agentResponse: string;
  timestamp: number;
  context?: Record<string, any>;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
}

export interface ContextualPrompt {
  systemPrompt: string;
  conversationHistory: ConversationTurn[];
  currentQuery: string;
  contextSummary?: string;
}

/**
 * Phase 2, Day 5: Get last 5 conversation turns for an agent
 */
export function getLast5Turns(agentId: string): ConversationTurn[] {
  const entries = useAgentMemoryStore.getState().getRecentForAgent(agentId, 5);

  return entries
    .filter(entry => entry.success && entry.response)
    .map(entry => ({
      id: entry.id,
      agentId: entry.agentId,
      userQuery: entry.prompt,
      agentResponse: entry.response || '',
      timestamp: entry.createdAt,
      context: {},
      tokens: entry.tokens
        ? {
            prompt: entry.tokens.prompt ?? undefined,
            completion: entry.tokens.completion ?? undefined,
            total: entry.tokens.total ?? undefined,
          }
        : undefined,
    }))
    .reverse(); // Oldest first for conversation flow
}

/**
 * Phase 2, Day 5: Build context-aware prompt with last 5 turns
 */
export function buildContextualPrompt(
  agentId: string,
  currentQuery: string,
  systemPrompt?: string
): ContextualPrompt {
  const last5Turns = getLast5Turns(agentId);
  const defaultSystemPrompt =
    systemPrompt ||
    'You are a helpful AI assistant. Use the conversation history to provide context-aware responses.';

  // Build conversation history string
  const _conversationHistory = last5Turns
    .map((turn, idx) => {
      return `Turn ${idx + 1}:
User: ${turn.userQuery}
Assistant: ${turn.agentResponse}`;
    })
    .join('\n\n');

  // Generate context summary if we have history
  let contextSummary: string | undefined;
  if (last5Turns.length > 0) {
    const recentTopics = last5Turns.map(t => t.userQuery.toLowerCase()).join(', ');
    contextSummary = `Recent conversation topics: ${recentTopics}`;
  }

  return {
    systemPrompt: defaultSystemPrompt,
    conversationHistory: last5Turns,
    currentQuery,
    contextSummary,
  };
}

/**
 * Phase 2, Day 5: Generate context-aware response using last 5 turns
 */
export async function generateContextualResponse(
  agentId: string,
  query: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    includeHistory?: boolean;
  }
): Promise<string> {
  const includeHistory = options?.includeHistory ?? true;

  if (!includeHistory) {
    // Simple response without context
    // SECURITY: Use runTask instead of getChatCompletion (which doesn't exist)
    const systemPrompt = options?.systemPrompt || 'You are a helpful AI assistant.';
    const fullPrompt = `${systemPrompt}\n\nUser: ${query}\nAssistant:`;
    const result = await aiEngine.runTask({
      kind: 'agent',
      prompt: fullPrompt,
      llm: {
        model: options?.model || 'ollama/llama3',
        temperature: options?.temperature || 0.7,
      },
    });
    return result.text;
  }

  // Build contextual prompt
  const contextualPrompt = buildContextualPrompt(agentId, query, options?.systemPrompt);

  // Construct messages with conversation history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `${contextualPrompt.systemPrompt}\n\n${contextualPrompt.contextSummary || ''}`,
    },
  ];

  // Add conversation history
  contextualPrompt.conversationHistory.forEach(turn => {
    messages.push({ role: 'user', content: turn.userQuery });
    messages.push({ role: 'assistant', content: turn.agentResponse });
  });

  // Add current query
  messages.push({ role: 'user', content: query });

  // Generate response
  // SECURITY: Convert messages array to prompt string for runTask
  const promptParts: string[] = [];
  messages.forEach(msg => {
    if (msg.role === 'system') {
      promptParts.push(`System: ${msg.content}`);
    } else if (msg.role === 'user') {
      promptParts.push(`User: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      promptParts.push(`Assistant: ${msg.content}`);
    }
  });
  const fullPrompt = promptParts.join('\n\n');

  const result = await aiEngine.runTask({
    kind: 'agent',
    prompt: fullPrompt,
    llm: {
      model: options?.model || 'ollama/llama3',
      temperature: options?.temperature || 0.7,
    },
  });

  return result.text;
}

/**
 * Phase 2, Day 5: Save conversation turn to memory
 */
export function saveConversationTurn(
  agentId: string,
  userQuery: string,
  agentResponse: string,
  options?: {
    runId?: string;
    tokens?: { prompt?: number; completion?: number; total?: number };
    context?: Record<string, any>;
  }
): void {
  useAgentMemoryStore.getState().addEntry({
    agentId,
    runId: options?.runId,
    prompt: userQuery,
    response: agentResponse,
    success: true,
    tokens: options?.tokens,
    createdAt: Date.now(),
  });
}

/**
 * Phase 2, Day 5: Get conversation context summary
 */
export function getConversationContext(agentId: string): {
  turnCount: number;
  lastTopic?: string;
  recentTopics: string[];
  summary: string;
} {
  const last5Turns = getLast5Turns(agentId);

  if (last5Turns.length === 0) {
    return {
      turnCount: 0,
      recentTopics: [],
      summary: 'No conversation history',
    };
  }

  const recentTopics = last5Turns.map(t => t.userQuery);
  const lastTopic = recentTopics[recentTopics.length - 1];

  return {
    turnCount: last5Turns.length,
    lastTopic,
    recentTopics,
    summary: `Last ${last5Turns.length} turns: ${recentTopics.join(', ')}`,
  };
}
