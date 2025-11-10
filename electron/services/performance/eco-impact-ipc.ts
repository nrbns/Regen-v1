import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { getEcoImpactForecast } from './efficiency-manager';

const EcoImpactRequest = z.object({
  horizonMinutes: z.number().min(15).max(360).optional(),
});

export function registerEcoImpactIpc(): void {
  registerHandler('efficiency:ecoImpact', EcoImpactRequest, async (_event, request) => {
    return getEcoImpactForecast(request);
  });
}
