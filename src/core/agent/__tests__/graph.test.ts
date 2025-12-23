import { describe, expect, it, vi } from 'vitest';
import { agentTaskGraph, type AgentPlan } from '../graph';

const memoryStub = {
  get: vi.fn().mockReturnValue(null),
  set: vi.fn(),
  remember: vi.fn(),
};

describe('AgentTaskGraph', () => {
  it('respects maxNodes and propagates safety context', async () => {
    const toolSpy = vi.fn(async (_input, _ctx) => 'ok');
    const toolName = `test_tool_${Math.random().toString(16).slice(2)}`;
    agentTaskGraph.registerTool(toolName, toolSpy as any);

    const plan: AgentPlan = {
      id: 'plan-test',
      nodes: [
        { id: 'a', tool: toolName, input: {} },
        { id: 'b', tool: toolName, input: {} },
      ],
    };

    const safety = { allowedDomains: ['example.com'], requireConsent: true };

    const result = await agentTaskGraph.runPlan(plan, memoryStub, {
      safety,
      maxNodes: 1,
      runId: 'run-test',
    });

    expect(toolSpy).toHaveBeenCalledTimes(1);
    expect(result.results.length).toBe(1);
    const ctxArg = toolSpy.mock.calls[0]?.[1];
    expect(ctxArg?.safety).toEqual(safety);
  });
});
