/**
 * Agent Planner - Tier 3 Pillar 1
 * Convert natural language goals into executable plans
 */
import type { AgentPlan } from './graph';
/**
 * Plan a multi-step task from a goal
 */
export declare function planFromGoal(goal: string): Promise<AgentPlan>;
/**
 * Execute a plan from a goal (high-level API)
 */
export declare function executePlanFromGoal(goal: string): Promise<unknown>;
