/**
 * Advanced Agent Planner
 * Breaks down complex tasks into executable steps with dependencies
 */
export interface TaskStep {
  id: string;
  type: 'search' | 'fetch' | 'summarize' | 'analyze' | 'synthesize' | 'format';
  description: string;
  dependencies: string[];
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}
export interface ExecutionPlan {
  id: string;
  query: string;
  steps: TaskStep[];
  estimatedTime: number;
  estimatedCost: number;
}
/**
 * Plan a research task
 */
export declare function planResearchTask(
  query: string,
  options?: {
    includeCounterpoints?: boolean;
    maxSteps?: number;
    complexity?: 'simple' | 'medium' | 'complex';
  }
): ExecutionPlan;
/**
 * Validate execution plan
 */
export declare function validatePlan(plan: ExecutionPlan): {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
/**
 * Optimize execution plan
 */
export declare function optimizePlan(plan: ExecutionPlan): ExecutionPlan;
