import { z } from 'zod';

export const PriceListing = z.object({
  title: z.string(),
  price: z.string(),
  currency: z.string().optional(),
  url: z.string().url().optional(),
});

export type SchemaName = 'PriceListing';

export const registry = new Map<SchemaName, any>([
  ['PriceListing', PriceListing]
]);


