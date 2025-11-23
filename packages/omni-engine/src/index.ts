/**
 * Omni Engine - Main Entry Point
 * Exports for use as a library
 */

export { commandHandler } from './handlers/command';
export { workflowHandler } from './handlers/workflow';
export { planCommand } from './planner';
export { executePlan } from './executor';
export type { CommandRequest, CommandResponse } from './handlers/command';
export type { ExecutionPlan, PlanStep } from './planner';
export type { ExecutionResult } from './executor';
export type { Workflow } from './handlers/workflow';
