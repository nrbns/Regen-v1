/**
 * Agent Context Store
 * Persistent storage for agent memory, goals, preferences, and history
 */

import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createLogger } from '../utils/logger';

const log = createLogger('agent-context');

export interface AgentContext {
  agentId: string;
  lastTasks: Array<{
    taskId: string;
    goal: string;
    completedAt: number;
    result?: unknown;
  }>;
  ongoingGoals: Array<{
    goalId: string;
    goal: string;
    startedAt: number;
    status: 'active' | 'paused' | 'completed';
  }>;
  preferences: Record<string, unknown>;
  history: Array<{
    timestamp: number;
    action: string;
    result?: unknown;
    error?: string;
  }>;
  embeddings?: Record<string, number[]>; // Optional: vector embeddings for semantic search
  updatedAt: number;
}

const CONTEXT_DIR = join(app.getPath('userData'), 'agent-contexts');
if (!existsSync(CONTEXT_DIR)) {
  mkdirSync(CONTEXT_DIR, { recursive: true });
}

function getContextPath(agentId: string): string {
  return join(CONTEXT_DIR, `${agentId}.json`);
}

/**
 * Load agent context from disk
 */
export function loadAgentContext(agentId: string): AgentContext | null {
  try {
    const path = getContextPath(agentId);
    if (!existsSync(path)) {
      return null;
    }
    const data = readFileSync(path, 'utf-8');
    const context = JSON.parse(data) as AgentContext;
    // Validate structure
    if (!context.agentId || context.agentId !== agentId) {
      log.warn('Context file has mismatched agentId', { agentId, contextAgentId: context.agentId });
      return null;
    }
    return context;
  } catch (error) {
    log.error('Failed to load agent context', { agentId, error });
    return null;
  }
}

/**
 * Save agent context to disk
 */
export function saveAgentContext(context: AgentContext): void {
  try {
    const path = getContextPath(context.agentId);
    context.updatedAt = Date.now();
    // Atomic write: write to temp file first, then rename
    const tempPath = `${path}.tmp`;
    writeFileSync(tempPath, JSON.stringify(context, null, 2), 'utf-8');
    // Rename is atomic on most filesystems
    const fs = require('fs');
    fs.renameSync(tempPath, path);
    log.info('Agent context saved', { agentId: context.agentId });
  } catch (error) {
    log.error('Failed to save agent context', { agentId: context.agentId, error });
  }
}

/**
 * Create or get agent context
 */
export function getOrCreateContext(agentId: string): AgentContext {
  const existing = loadAgentContext(agentId);
  if (existing) {
    return existing;
  }
  return {
    agentId,
    lastTasks: [],
    ongoingGoals: [],
    preferences: {},
    history: [],
    updatedAt: Date.now(),
  };
}

/**
 * Update agent context with new task result
 */
export function recordTaskResult(
  agentId: string,
  taskId: string,
  goal: string,
  result?: unknown,
  error?: string
): void {
  const context = getOrCreateContext(agentId);

  // Add to last tasks (keep last 10)
  context.lastTasks.unshift({
    taskId,
    goal,
    completedAt: Date.now(),
    result,
  });
  if (context.lastTasks.length > 10) {
    context.lastTasks = context.lastTasks.slice(0, 10);
  }

  // Add to history
  context.history.unshift({
    timestamp: Date.now(),
    action: `task:${taskId}`,
    result,
    error,
  });
  if (context.history.length > 100) {
    context.history = context.history.slice(0, 100);
  }

  saveAgentContext(context);
}

/**
 * Add or update ongoing goal
 */
export function updateOngoingGoal(
  agentId: string,
  goalId: string,
  goal: string,
  status: 'active' | 'paused' | 'completed'
): void {
  const context = getOrCreateContext(agentId);
  const existing = context.ongoingGoals.find(g => g.goalId === goalId);

  if (existing) {
    existing.status = status;
    existing.goal = goal;
  } else {
    context.ongoingGoals.push({
      goalId,
      goal,
      startedAt: Date.now(),
      status,
    });
  }

  // Remove completed goals older than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  context.ongoingGoals = context.ongoingGoals.filter(
    g => g.status !== 'completed' || g.startedAt > sevenDaysAgo
  );

  saveAgentContext(context);
}

/**
 * Update agent preferences
 */
export function updatePreferences(agentId: string, preferences: Record<string, unknown>): void {
  const context = getOrCreateContext(agentId);
  context.preferences = { ...context.preferences, ...preferences };
  saveAgentContext(context);
}

/**
 * Get agent context for injection into agent run
 */
export function getContextForRun(agentId: string): {
  lastTasks: AgentContext['lastTasks'];
  ongoingGoals: AgentContext['ongoingGoals'];
  preferences: AgentContext['preferences'];
  recentHistory: AgentContext['history'];
} {
  const context = getOrCreateContext(agentId);
  return {
    lastTasks: context.lastTasks.slice(0, 5), // Last 5 tasks
    ongoingGoals: context.ongoingGoals.filter(g => g.status === 'active'),
    preferences: context.preferences,
    recentHistory: context.history.slice(0, 10), // Last 10 history entries
  };
}

/**
 * Clear agent context (for testing/reset)
 */
export function clearAgentContext(agentId: string): void {
  try {
    const path = getContextPath(agentId);
    if (existsSync(path)) {
      const fs = require('fs');
      fs.unlinkSync(path);
      log.info('Agent context cleared', { agentId });
    }
  } catch (error) {
    log.error('Failed to clear agent context', { agentId, error });
  }
}
