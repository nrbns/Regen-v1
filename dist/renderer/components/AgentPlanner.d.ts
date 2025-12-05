/**
 * Agent Planner UI Component
 * Generate and execute multi-step plans
 */
export interface PlanStep {
    id: string;
    action: string;
    args: Record<string, unknown>;
    expectedOutput?: string;
}
export interface Plan {
    id: string;
    goal: string;
    steps: PlanStep[];
    estimatedDuration?: number;
}
export declare function AgentPlanner(): import("react/jsx-runtime").JSX.Element;
