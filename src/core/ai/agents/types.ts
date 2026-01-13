/**
 * Agent Types - Type definitions for controlled agents
 */

import type { Task } from '../../execution/task';

/**
 * Agent step in execution
 */
export interface AgentStep {
  id: string;
  type: 'plan' | 'tool' | 'execute' | 'observe' | 'decide';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  tool?: string;
  reasoning?: string;
  timestamp: number;
  duration?: number;
}

/**
 * Agent plan (visible to user before execution)
 */
export interface AgentPlan {
  goal: string;
  steps: Array<{
    id: string;
    tool: string;
    parameters: Record<string, any>;
    reasoning: string;
  }>;
  estimatedDuration?: number;
  estimatedCost?: number;
}

/**
 * Agent configuration (strict limits)
 */
export interface AgentConfig {
  maxSteps: number; // Maximum number of steps
  maxDuration: number; // Maximum duration in milliseconds
  allowedTools: string[]; // Only these tools can be used
  requiresApproval: boolean; // Must user approve plan?
  timeout?: number; // Per-step timeout
  allowBackgroundExecution?: boolean; // Default: false (never)
}

/**
 * Agent state (always visible to user)
 */
export interface AgentState {
  taskId: string;
  goal: string;
  plan: AgentPlan | null;
  steps: AgentStep[];
  currentStepIndex: number;
  status: 'planning' | 'approved' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  pausedAt?: number;
  cancelledAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent tool (explicitly registered)
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  execute: (params: Record<string, any>) => Promise<any>;
  requiresApproval?: boolean; // Does this tool need user approval?
  isSafe?: boolean; // Is this tool safe to auto-execute?
}

/**
 * Agent result
 */
export interface AgentResult {
  success: boolean;
  steps: AgentStep[];
  result?: any;
  error?: string;
  duration?: number;
  stepsExecuted?: number;
}

/**
 * Agent event (for UI updates)
 */
export interface AgentEvent {
  type: 'plan_created' | 'step_started' | 'step_completed' | 'step_failed' | 'paused' | 'cancelled' | 'completed' | 'failed';
  step?: AgentStep;
  state?: AgentState;
  error?: string;
}
