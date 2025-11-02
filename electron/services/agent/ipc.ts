/**
 * Agent IPC Handlers
 */

import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { AgentHost, AgentTaskSchema } from './host';
import { AgentStore } from './store';
import { ConsentLedger } from '../consent-ledger';

let agentHost: AgentHost | null = null;

export function registerAgentIpc(): void {
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
      budget: parsed.budget && Object.keys(parsed.budget).length > 0
        ? { ...defaultBudget, ...parsed.budget }
        : defaultBudget,
      policyProfile: parsed.policyProfile || 'balanced',
    };
    
    const taskId = await agentHost!.createTask(task);
    return { taskId };
  });

  registerHandler('agent:generatePlan', z.object({
    taskId: z.string(),
    observations: z.array(z.object({
      url: z.string().optional(),
      html: z.string().optional(),
      text: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })).optional(),
  }), async (_event, request) => {
    return await agentHost!.generatePlan(request.taskId, request.observations);
  });

  registerHandler('agent:executeTask', z.object({
    taskId: z.string(),
    confirmSteps: z.array(z.string()).optional().default([]),
  }), async (_event, request) => {
    return await agentHost!.executeTask(request.taskId, request.confirmSteps);
  });

  registerHandler('agent:cancelTask', z.object({ taskId: z.string() }), async (_event, request) => {
    await agentHost!.cancelTask(request.taskId);
    return { success: true };
  });

  registerHandler('agent:getStatus', z.object({ taskId: z.string() }), async (_event, request) => {
    return agentHost!.getTaskStatus(request.taskId);
  });
}

