/**
 * Agent Executor - Tier 3 Pillar 1
 * Safety-aware orchestration for plans, tools, and memory
 */

import { agentTaskGraph, type AgentPlan, type PlanExecutionResult } from './graph';
import { planFromGoal } from './planner';
import { agentMemory } from './memory';
import { toolRegistryV2 } from './tools/v2';
import {
  evaluateSafety,
  summarizeInput,
  type SafetyAuditEntry,
  type SafetyContext,
} from './safety';
import { log } from '../../utils/logger';

export type AgentExecutionOptions = {
  runId?: string;
  safety?: SafetyContext;
  maxNodes?: number;
};

export type AgentExecutionResult = PlanExecutionResult & { audit: SafetyAuditEntry[]; runId: string };

class AgentExecutor {
  private initialized = false;
  private auditLogs: Map<string, SafetyAuditEntry[]> = new Map();

  initialize(): void {
    if (this.initialized) return;

    const tools = toolRegistryV2.getAll();
    tools.forEach(tool => {
      agentTaskGraph.registerTool(tool.name, async (input, ctx) => {
        const runId = ctx.runId || ctx.planId;
        const decision = await evaluateSafety(tool.name, input, ctx.safety);

        this.logAudit(runId, {
          tool: tool.name,
          nodeId: ctx.nodeId,
          risk: decision.risk,
          allowed: decision.allowed,
          consentRequired: decision.consentRequired,
          consentGranted: decision.consentGranted,
          reason: decision.reason,
          inputPreview: summarizeInput(input),
          timestamp: Date.now(),
          runId: runId || 'unknown',
        });

        if (!decision.allowed) {
          throw new Error(decision.reason || 'Blocked by safety system');
        }

        return toolRegistryV2.execute(tool.name, input, ctx);
      });
    });

    log.info(`[AgentExecutor] Registered ${tools.length} tools with safety guards`);
    this.initialized = true;
  }

  async runGoal(goal: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    const plan = await planFromGoal(goal);
    return this.runPlan(plan, { ...options, runId: options?.runId || plan.id });
  }

  async runPlan(plan: AgentPlan, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.initialize();
    const runId = options?.runId || plan.id;
    this.auditLogs.set(runId, []);

    const result = await agentTaskGraph.runPlan(plan, agentMemory, {
      safety: options?.safety,
      runId,
      maxNodes: options?.maxNodes,
    });

    // Save successful results into memory for learning
    if (result.success && result.finalOutput) {
      const findings = typeof result.finalOutput === 'string' 
        ? result.finalOutput 
        : JSON.stringify(result.finalOutput);
      
      agentMemory.remember(
        'fact',
        `plan:${runId}:output`,
        findings
      );
      
      // Also remember the plan itself for pattern recognition
      agentMemory.remember(
        'task_history',
        `plan:${runId}`,
        {
          goal: plan.metadata?.goal,
          steps: result.results.length,
          duration: result.totalDuration,
          timestamp: Date.now(),
        }
      );
    }

    return {
      ...result,
      audit: this.auditLogs.get(runId) || [],
      runId,
    };
  }

  getAudit(runId: string): SafetyAuditEntry[] {
    return this.auditLogs.get(runId) || [];
  }

  getAllAudits(): Map<string, SafetyAuditEntry[]> {
    return new Map(this.auditLogs);
  }

  private logAudit(runId: string | undefined, entry: SafetyAuditEntry): void {
    const id = runId || 'unknown';
    const existing = this.auditLogs.get(id) || [];
    existing.push({ ...entry, runId: id });
    this.auditLogs.set(id, existing);
  }
}

export const agentExecutor = new AgentExecutor();
