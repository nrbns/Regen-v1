import type { MemoryEvent } from '../supermemory/event-types';
import type { AgentMemoryEntry } from '../../state/agentMemoryStore';

export type AgentCapability =
  | 'memory:read'
  | 'memory:write'
  | 'web:fetch'
  | 'redix:ask'
  | 'system:dispatch';

export interface AgentToolContext {
  signal?: AbortSignal;
  memorySearch: (query: string) => Promise<MemoryEvent[]>;
  saveMemory: (event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>) => Promise<string>;
  redixAsk: (prompt: string) => Promise<string>;
  safeFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export interface AgentTool {
  id: string;
  description: string;
  requiredCapabilities: AgentCapability[];
  run: (input: Record<string, unknown>, ctx: AgentToolContext) => Promise<unknown>;
}

export type AgentToolExecutor = (
  input: Record<string, unknown>,
  ctx?: Partial<AgentToolContext>
) => Promise<unknown>;

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  tools: string[];
  entryPoint: (input: AgentExecutionInput, env: AgentEnvironment) => Promise<AgentExecutionResult>;
  trigger?: {
    keywords?: string[];
    intent?: Array<'research' | 'comparison' | 'fact' | 'timeline'>;
  };
  maxSteps?: number;
}

export interface AgentExecutionInput {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AgentEnvironment {
  tools: Record<string, AgentToolExecutor>;
  dispatchEvent: (type: string, payload?: any) => void;
  capabilities: AgentCapability[];
  signal?: AbortSignal;
  recentRuns: AgentMemoryEntry[];
}

export interface AgentExecutionResult {
  success: boolean;
  output?: string;
  steps?: AgentExecutionStep[];
  error?: string;
}

export interface AgentExecutionStep {
  toolId: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: number;
  finishedAt: number;
}

export interface AgentRunRecord {
  id: string;
  agentId: string;
  prompt: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  result?: AgentExecutionResult;
  startedAt?: number;
  finishedAt?: number;
}


