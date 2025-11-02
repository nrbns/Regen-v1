import { z } from 'zod';

export const DSL = z.object({
  goal: z.string(),
  sources: z.array(z.union([z.string().url(), z.object({ query: z.string() })])).default([]),
  steps: z.array(z.object({ skill: z.string(), args: z.record(z.any()) })).default([]),
  output: z.object({ type: z.enum(['json','csv','sqlite']), schema: z.any() }),
  policy: z.object({ maxSteps: z.number().default(40), maxMinutes: z.number().default(5) }).default({}),
});

export type Dsl = z.infer<typeof DSL>;


