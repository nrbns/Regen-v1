/**
 * Agent Task Graph - Tier 3 Pillar 1
 * Graph-based multi-step task execution
 */

import { log } from '../../utils/logger';
import { track } from '../../services/analytics';

export type AgentNode = {
  id: string;
  tool: string; // Tool name from registry
  input: Record<string, unknown>; // Tool input
  inputFrom?: string[]; // Node IDs to get input from
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
};

export type AgentPlan = {
  id: string;
  nodes: AgentNode[];
  metadata?: {
    goal?: string;
    userId?: string;
    createdAt?: number;
  };
};

export type NodeResult = {
  nodeId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
};

export type PlanExecutionResult = {
  planId: string;
  success: boolean;
  results: NodeResult[];
  finalOutput?: unknown;
  error?: string;
  totalDuration: number;
};

type ToolRegistry = Map<string, (input: unknown, ctx: ToolContext) => Promise<unknown>>;

export interface ToolContext {
  planId: string;
  nodeId: string;
  previousResults: Map<string, unknown>;
  memory: AgentMemory;
}

export interface AgentMemory {
  get: (key: string) => unknown | null;
  set: (key: string, value: unknown) => void;
  remember: (type: 'preference' | 'fact' | 'task_history', key: string, value: unknown) => void;
}

class AgentTaskGraph {
  private toolRegistry: ToolRegistry = new Map();

  /**
   * Register a tool
   */
  registerTool(
    name: string,
    handler: (input: unknown, ctx: ToolContext) => Promise<unknown>
  ): void {
    this.toolRegistry.set(name, handler);
    log.info(`[AgentGraph] Registered tool: ${name}`);
  }

  /**
   * Create a plan from a goal
   */
  createPlan(goal: string, nodes: Omit<AgentNode, 'id'>[]): AgentPlan {
    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nodes: nodes.map(node => ({
        ...node,
        id: (node as any).id || `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        retryCount: 0,
        maxRetries: node.maxRetries ?? 3,
        timeout: node.timeout ?? 30000, // 30s default
      })),
      metadata: {
        goal,
        createdAt: Date.now(),
      },
    };
  }

  /**
   * Execute a plan
   */
  async runPlan(plan: AgentPlan, memory: AgentMemory): Promise<PlanExecutionResult> {
    const startTime = performance.now();
    const results: NodeResult[] = [];
    const previousResults = new Map<string, unknown>();

    log.info(`[AgentGraph] Executing plan: ${plan.id} (${plan.nodes.length} nodes)`);
    track('agent_plan_started' as any, { planId: plan.id, nodeCount: plan.nodes.length });

    try {
      // Execute nodes in order (topological sort would be better for complex graphs)
      for (const node of plan.nodes) {
        const nodeStartTime = performance.now();

        try {
          // Resolve input from previous nodes
          const resolvedInput = await this.resolveNodeInput(node, previousResults);

          // Get tool handler
          const toolHandler = this.toolRegistry.get(node.tool);
          if (!toolHandler) {
            throw new Error(`Tool not found: ${node.tool}`);
          }

          // Execute with timeout
          const output = await this.executeWithTimeout(
            () =>
              toolHandler(resolvedInput, {
                planId: plan.id,
                nodeId: node.id,
                previousResults,
                memory,
              }),
            node.timeout || 30000
          );

          const duration = performance.now() - nodeStartTime;
          results.push({
            nodeId: node.id,
            success: true,
            output,
            duration,
          });

          previousResults.set(node.id, output);
          log.info(`[AgentGraph] Node ${node.id} completed in ${duration.toFixed(0)}ms`);

          // Remember successful execution
          memory.remember('task_history', `node:${node.id}`, {
            tool: node.tool,
            success: true,
            timestamp: Date.now(),
          });
        } catch (error) {
          const duration = performance.now() - nodeStartTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Retry logic
          if ((node.retryCount || 0) < (node.maxRetries || 3)) {
            node.retryCount = (node.retryCount || 0) + 1;
            log.warn(
              `[AgentGraph] Node ${node.id} failed, retrying (${node.retryCount}/${node.maxRetries})`
            );

            // Retry the node
            const retryResult = await this.retryNode(node, previousResults, memory);
            results.push(retryResult);
            if (retryResult.success && retryResult.output) {
              previousResults.set(node.id, retryResult.output);
            }
          } else {
            results.push({
              nodeId: node.id,
              success: false,
              error: errorMessage,
              duration,
            });

            log.error(`[AgentGraph] Node ${node.id} failed after retries: ${errorMessage}`);
            // Continue with other nodes (partial failure)
          }
        }
      }

      const totalDuration = performance.now() - startTime;
      const success = results.every(r => r.success);
      const finalOutput = results[results.length - 1]?.output;

      const result: PlanExecutionResult = {
        planId: plan.id,
        success,
        results,
        finalOutput,
        totalDuration,
      };

      track('agent_plan_completed' as any, {
        planId: plan.id,
        success,
        nodeCount: plan.nodes.length,
        duration: totalDuration,
      });

      return result;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      track('agent_plan_failed' as any, { planId: plan.id, error: errorMessage });

      return {
        planId: plan.id,
        success: false,
        results,
        error: errorMessage,
        totalDuration,
      };
    }
  }

  /**
   * Resolve node input from previous results
   */
  private async resolveNodeInput(
    node: AgentNode,
    previousResults: Map<string, unknown>
  ): Promise<unknown> {
    if (!node.inputFrom || node.inputFrom.length === 0) {
      return node.input;
    }

    // Merge inputs from previous nodes
    const mergedInput = { ...node.input };
    for (const sourceNodeId of node.inputFrom) {
      const sourceOutput = previousResults.get(sourceNodeId);
      if (sourceOutput) {
        // Merge source output into input
        if (typeof sourceOutput === 'object' && sourceOutput !== null) {
          Object.assign(mergedInput, sourceOutput);
        } else {
          mergedInput[sourceNodeId] = sourceOutput;
        }
      }
    }

    return mergedInput;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Retry a failed node
   */
  private async retryNode(
    node: AgentNode,
    previousResults: Map<string, unknown>,
    memory: AgentMemory
  ): Promise<NodeResult> {
    const startTime = performance.now();

    try {
      const resolvedInput = await this.resolveNodeInput(node, previousResults);
      const toolHandler = this.toolRegistry.get(node.tool);
      if (!toolHandler) {
        throw new Error(`Tool not found: ${node.tool}`);
      }

      const output = await this.executeWithTimeout(
        () =>
          toolHandler(resolvedInput, {
            planId: 'retry',
            nodeId: node.id,
            previousResults,
            memory,
          }),
        node.timeout || 30000
      );

      return {
        nodeId: node.id,
        success: true,
        output,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        nodeId: node.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - startTime,
      };
    }
  }
}

// Singleton instance
export const agentTaskGraph = new AgentTaskGraph();
