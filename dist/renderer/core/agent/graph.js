/**
 * Agent Task Graph - Tier 3 Pillar 1
 * Graph-based multi-step task execution
 */
import { log } from '../../utils/logger';
import { track } from '../../services/analytics';
class AgentTaskGraph {
    toolRegistry = new Map();
    /**
     * Register a tool
     */
    registerTool(name, handler) {
        this.toolRegistry.set(name, handler);
        log.info(`[AgentGraph] Registered tool: ${name}`);
    }
    /**
     * Create a plan from a goal
     */
    createPlan(goal, nodes) {
        return {
            id: `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            nodes: nodes.map(node => ({
                ...node,
                id: node.id || `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    async runPlan(plan, memory) {
        const startTime = performance.now();
        const results = [];
        const previousResults = new Map();
        log.info(`[AgentGraph] Executing plan: ${plan.id} (${plan.nodes.length} nodes)`);
        track('agent_plan_started', { planId: plan.id, nodeCount: plan.nodes.length });
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
                    const output = await this.executeWithTimeout(() => toolHandler(resolvedInput, {
                        planId: plan.id,
                        nodeId: node.id,
                        previousResults,
                        memory,
                    }), node.timeout || 30000);
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
                }
                catch (error) {
                    const duration = performance.now() - nodeStartTime;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    // Retry logic
                    if ((node.retryCount || 0) < (node.maxRetries || 3)) {
                        node.retryCount = (node.retryCount || 0) + 1;
                        log.warn(`[AgentGraph] Node ${node.id} failed, retrying (${node.retryCount}/${node.maxRetries})`);
                        // Retry the node
                        const retryResult = await this.retryNode(node, previousResults, memory);
                        results.push(retryResult);
                        if (retryResult.success && retryResult.output) {
                            previousResults.set(node.id, retryResult.output);
                        }
                    }
                    else {
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
            const result = {
                planId: plan.id,
                success,
                results,
                finalOutput,
                totalDuration,
            };
            track('agent_plan_completed', {
                planId: plan.id,
                success,
                nodeCount: plan.nodes.length,
                duration: totalDuration,
            });
            return result;
        }
        catch (error) {
            const totalDuration = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            track('agent_plan_failed', { planId: plan.id, error: errorMessage });
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
    async resolveNodeInput(node, previousResults) {
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
                }
                else {
                    mergedInput[sourceNodeId] = sourceOutput;
                }
            }
        }
        return mergedInput;
    }
    /**
     * Execute with timeout
     */
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)),
        ]);
    }
    /**
     * Retry a failed node
     */
    async retryNode(node, previousResults, memory) {
        const startTime = performance.now();
        try {
            const resolvedInput = await this.resolveNodeInput(node, previousResults);
            const toolHandler = this.toolRegistry.get(node.tool);
            if (!toolHandler) {
                throw new Error(`Tool not found: ${node.tool}`);
            }
            const output = await this.executeWithTimeout(() => toolHandler(resolvedInput, {
                planId: 'retry',
                nodeId: node.id,
                previousResults,
                memory,
            }), node.timeout || 30000);
            return {
                nodeId: node.id,
                success: true,
                output,
                duration: performance.now() - startTime,
            };
        }
        catch (error) {
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
