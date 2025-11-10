import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getTrustSummary, listTrustRecords, submitTrustSignal } from './trust-weaver';

const SubmitSchema = z.object({
  domain: z.string(),
  url: z.string().optional(),
  title: z.string().optional(),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  comment: z.string().optional(),
  sourcePeer: z.string().optional(),
});

const GetSchema = z.object({
  domain: z.string(),
});

export function registerTrustWeaverIpc(): void {
  registerHandler('trust:list', z.object({}), async () => {
    const records = await listTrustRecords();
    return { records };
  });

  registerHandler('trust:get', GetSchema, async (_event, request) => {
    const summary = await getTrustSummary(request.domain);
    if (!summary) {
      return { found: false };
    }
    return { found: true, summary };
  });

  registerHandler('trust:submit', SubmitSchema, async (_event, request) => {
    const summary = await submitTrustSignal(request);
    return { summary };
  });
}
