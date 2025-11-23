/**
 * Agent IPC Handlers
 */

import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { AgentHost, AgentTaskSchema } from './host';
import { AgentStore } from './store';
import { ConsentLedger } from '../consent-ledger';
import { getPlanner, Plan } from './planner';
import { getPlanExecutor } from './executor';
import { getGuardrails } from './guardrails';

let agentHost: AgentHost | null = null;

export function registerAgentIpc(): void {
  // Load all agent skills
  import('./skills/index').catch(console.error);

  // Initialize agent host
  if (!agentHost) {
    const store = new AgentStore();
    const ledger = new ConsentLedger();
    agentHost = new AgentHost(store, ledger);
  }

  registerHandler('agent:createTask', AgentTaskSchema, async (_event, request) => {
    // Ensure required fields with defaults - merge budget properly
    const defaultBudget = {
      tokens: 8192,
      seconds: 300,
      requests: 100,
      downloads: 10,
    };

    // Parse with defaults from schema
    const parsed = AgentTaskSchema.parse(request);

    const task = {
      ...parsed,
      budget:
        parsed.budget && Object.keys(parsed.budget).length > 0
          ? { ...defaultBudget, ...parsed.budget }
          : defaultBudget,
      policyProfile: parsed.policyProfile || 'balanced',
    };

    const taskId = await agentHost!.createTask(task);
    return { taskId };
  });

  registerHandler(
    'agent:generatePlan',
    z.object({
      taskId: z.string(),
      observations: z
        .array(
          z.object({
            url: z.string().optional(),
            html: z.string().optional(),
            text: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
          })
        )
        .optional(),
    }),
    async (_event, request) => {
      return await agentHost!.generatePlan(request.taskId, request.observations);
    }
  );

  registerHandler(
    'agent:executeTask',
    z.object({
      taskId: z.string(),
      confirmSteps: z.array(z.string()).optional().default([]),
      agentId: z.string().optional(), // Optional agent ID for context persistence
    }),
    async (_event, request) => {
      return await agentHost!.executeTask(request.taskId, request.confirmSteps, request.agentId);
    }
  );

  registerHandler('agent:cancelTask', z.object({ taskId: z.string() }), async (_event, request) => {
    await agentHost!.cancelTask(request.taskId);
    return { success: true };
  });

  registerHandler('agent:getStatus', z.object({ taskId: z.string() }), async (_event, request) => {
    return agentHost!.getTaskStatus(request.taskId);
  });

  // New planner endpoints
  registerHandler(
    'agent:generatePlanFromGoal',
    z.object({
      goal: z.string(),
      mode: z.string().optional(),
      constraints: z.array(z.string()).optional(),
    }),
    async (_event, request) => {
      const planner = getPlanner();
      const plan = await planner.generatePlan(request.goal, {
        mode: request.mode,
        constraints: request.constraints,
      });

      // Validate plan
      const validation = planner.validatePlan(plan);
      if (!validation.valid) {
        throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
      }

      // Check guardrails
      const guardrails = getGuardrails();
      for (const step of plan.steps) {
        const guardrailCheck = await guardrails.validateStep(step);
        if (!guardrailCheck.allowed) {
          throw new Error(`Step ${step.id} blocked by guardrails: ${guardrailCheck.reason}`);
        }
      }

      return plan;
    }
  );

  // Plan execution endpoint
  registerHandler(
    'agent:executePlan',
    z.object({
      planId: z.string(),
      plan: z.object({
        id: z.string(),
        goal: z.string(),
        steps: z.array(
          z.object({
            id: z.string(),
            action: z.string(),
            args: z.record(z.unknown()),
            dependsOn: z.array(z.string()).optional(),
            expectedOutput: z.string().optional(),
          })
        ),
      }),
    }),
    async (_event, request) => {
      const executor = getPlanExecutor();
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Convert plan format to match executor's Plan type
      const planForExecutor: Plan = {
        ...request.plan,
        createdAt: Date.now(),
      };

      const result = await executor.execute(planForExecutor, runId);
      return { runId, ...result };
    }
  );

  // Guardrails configuration
  registerHandler(
    'agent:guardrails:config',
    z.object({
      promptFirewall: z
        .object({
          enabled: z.boolean(),
          blockedPatterns: z.array(z.string()).optional(),
        })
        .optional(),
      domainPolicy: z
        .object({
          enabled: z.boolean(),
          allowedDomains: z.array(z.string()).optional(),
          deniedDomains: z.array(z.string()).optional(),
        })
        .optional(),
      rateLimits: z
        .object({
          enabled: z.boolean(),
          maxRequestsPerMinute: z.number().optional(),
          maxRequestsPerHour: z.number().optional(),
        })
        .optional(),
      piiScrubbing: z
        .object({
          enabled: z.boolean(),
        })
        .optional(),
    }),
    async (_event, request) => {
      const guardrails = getGuardrails();
      guardrails.updateConfig(request as any);
      return { success: true };
    }
  );

  // Guardrails check
  registerHandler(
    'agent:guardrails:check',
    z.object({
      type: z.enum(['prompt', 'domain', 'ratelimit', 'step']),
      data: z.record(z.unknown()),
    }),
    async (_event, request) => {
      const guardrails = getGuardrails();

      switch (request.type) {
        case 'prompt':
          return await guardrails.checkPrompt(request.data.prompt as string);
        case 'domain':
          return await guardrails.checkDomain(request.data.url as string);
        case 'ratelimit':
          return await guardrails.checkRateLimit(request.data.identifier as string);
        case 'step':
          return await guardrails.validateStep(request.data.step as any);
        default:
          throw new Error(`Unknown guardrail type: ${request.type}`);
      }
    }
  );

  // Execute a single skill (agent primitive)
  registerHandler(
    'agent:executeSkill',
    z.object({
      skill: z.string(),
      args: z.record(z.unknown()),
    }),
    async (_event, request) => {
      // Import skills to ensure they're registered
      await import('./skills/index');

      const { registry } = await import('./skills/registry');
      const skill = registry.get(request.skill);

      if (!skill) {
        throw new Error(`Skill "${request.skill}" not found`);
      }

      // Execute skill with a mock context
      const ctx = {
        runId: `primitive_${Date.now()}`,
        memory: {},
      };

      try {
        // Execute with timeout protection
        const result = (await Promise.race([
          skill.exec(ctx, request.args),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Skill execution timeout')), 8000)
          ),
        ])) as unknown;

        return { success: true, result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Agent context management endpoints
  registerHandler(
    'agent:context:get',
    z.object({
      agentId: z.string(),
    }),
    async (_event, request) => {
      const { getContextForRun } = await import('./context-store');
      return getContextForRun(request.agentId);
    }
  );

  registerHandler(
    'agent:context:updatePreferences',
    z.object({
      agentId: z.string(),
      preferences: z.record(z.unknown()),
    }),
    async (_event, request) => {
      const { updatePreferences } = await import('./context-store');
      updatePreferences(request.agentId, request.preferences);
      return { success: true };
    }
  );

  registerHandler(
    'agent:context:updateGoal',
    z.object({
      agentId: z.string(),
      goalId: z.string(),
      goal: z.string(),
      status: z.enum(['active', 'paused', 'completed']),
    }),
    async (_event, request) => {
      const { updateOngoingGoal } = await import('./context-store');
      updateOngoingGoal(request.agentId, request.goalId, request.goal, request.status);
      return { success: true };
    }
  );

  registerHandler(
    'agent:context:clear',
    z.object({
      agentId: z.string(),
    }),
    async (_event, request) => {
      const { clearAgentContext } = await import('./context-store');
      clearAgentContext(request.agentId);
      return { success: true };
    }
  );
}
