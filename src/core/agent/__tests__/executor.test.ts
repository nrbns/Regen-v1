import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { agentExecutor } from '../executor';
import { toolRegistryV2 } from '../tools/v2';
import type { AgentPlan } from '../graph';

// Ensure no network calls in tests
const originalFetch = global.fetch;

describe('agentExecutor audit logging', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => '<html><title>t</title><body>hi</body></html>' })) as any;
  });

  it('records audit entries for allowed run', async () => {
    const toolName = 'noop_test';
    if (!toolRegistryV2.get(toolName)) {
      toolRegistryV2.register({
        name: toolName,
        description: 'noop',
        inputSchema: z.object({}).optional() as any,
        outputSchema: z.any(),
        run: async () => 'ok',
      });
    }

    const plan: AgentPlan = {
      id: 'plan-audit',
      nodes: [{ id: 'a', tool: toolName, input: {} }],
    };

    const result = await agentExecutor.runPlan(plan, { runId: 'audit-allowed' });
    expect(result.success).toBe(true);
    expect(result.audit.length).toBeGreaterThan(0);
    expect(result.audit[0]?.allowed).toBe(true);
  });

  it('records blocked audit when domain denied', async () => {
    const plan: AgentPlan = {
      id: 'plan-block',
      nodes: [{ id: 'b', tool: 'scrape_page', input: { url: 'https://blocked.test/page' } }],
    };

    const result = await agentExecutor.runPlan(plan, {
      runId: 'audit-blocked',
      safety: { deniedDomains: ['blocked.test'], requireConsent: true },
      maxNodes: 1,
    });

    expect(result.success).toBe(false);
    expect(result.audit.some(a => a.allowed === false)).toBe(true);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});
