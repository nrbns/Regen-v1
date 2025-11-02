import { z } from 'zod';
import { registry } from './skills/registry';
import { policyAllows } from './policy';
import { AgentStore } from './store';

export const DSL = z.object({
  goal: z.string(),
  sources: z.array(z.union([z.string().url(), z.object({ query: z.string() })])).default([]),
  steps: z.array(z.object({ skill: z.string(), args: z.record(z.any()) })).default([]),
  output: z.object({ type: z.enum(['json','csv','sqlite']), schema: z.any() }),
  policy: z.object({ maxSteps: z.number().default(40), maxMinutes: z.number().default(5) }).default({}),
});

export type Dsl = z.infer<typeof DSL>;

export type AgentContext = {
  runId: string;
  emitToken: (t: unknown) => void;
  emitStep: (s: unknown) => void;
};

export async function runAgent(store: AgentStore, ctx: AgentContext, dsl: Dsl) {
  const limits = { maxSteps: dsl.policy.maxSteps ?? 40 };
  let step = 0;
  let memory: Record<string, unknown> = {};

  store.start(ctx.runId, dsl);

  // Seed steps from DSL or do single-plan execution
  const plan = dsl.steps.length ? dsl.steps : [];

  while (step < limits.maxSteps) {
    const next = plan[step];
    if (!next) break;
    if (!policyAllows(next)) break;
    const tool = registry.get(next.skill);
    if (!tool) break;

    ctx.emitStep({ type: 'step', idx: step, skill: next.skill, args: next.args });
    try {
      const res = await tool.exec({ runId: ctx.runId, memory }, next.args);
      store.append(ctx.runId, { step, skill: next.skill, res });
      ctx.emitToken({ type: 'result', step, res });
      memory = { ...memory, [`step_${step}`]: res, last: res };
    } catch (e) {
      store.append(ctx.runId, { step, skill: next.skill, error: String(e) });
      ctx.emitToken({ type: 'error', step, error: String(e) });
      break;
    }
    step += 1;
  }

  store.finish(ctx.runId);
  return { runId: ctx.runId };
}


