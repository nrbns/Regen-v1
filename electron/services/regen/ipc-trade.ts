/**
 * Trade Mode IPC Handlers
 * Handle trade confirmations and automation management
 */

import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import * as tradeTools from './tools/tradeTools';
import type { TradeIntent } from './modes/trade';

const log = createLogger('regen-trade-ipc');

/**
 * Register Trade Mode IPC handlers
 */
export function registerTradeIpc(): void {
  // Confirm trade order
  registerHandler(
    'regen:trade:confirm',
    z.object({
      orderId: z.string().optional(),
      confirmed: z.boolean(),
      pendingOrder: z.object({
        type: z.enum(['buy', 'sell']),
        symbol: z.string(),
        quantity: z.number(),
        orderType: z.enum(['market', 'limit']).optional(),
        price: z.number().optional(),
      }),
    }),
    async (_event, request) => {
      if (!request.confirmed) {
        return { success: true, cancelled: true, message: 'Order cancelled by user' };
      }

      // Place paper trade
      const tradeIntent: TradeIntent = {
        type: request.pendingOrder.type,
        symbol: request.pendingOrder.symbol,
        quantity: request.pendingOrder.quantity,
        orderType: request.pendingOrder.orderType || 'market',
        price: request.pendingOrder.price,
      };

      const result = await tradeTools.placePaperTrade(tradeIntent);
      return result;
    }
  );

  // Get paper trading positions
  registerHandler('regen:trade:positions', z.object({}), async () => {
    const positions = tradeTools.getPaperPositions();
    return { success: true, positions };
  });

  // Create automation
  registerHandler(
    'regen:trade:createAutomation',
    z.object({
      userId: z.string(),
      symbol: z.string(),
      condition: z.string(),
      action: z.string(),
      quantity: z.number().optional(),
    }),
    async (_event, request) => {
      return await tradeTools.createAutomation(
        request.userId,
        request.symbol,
        request.condition,
        request.action,
        request.quantity
      );
    }
  );

  // Stop automation
  registerHandler(
    'regen:trade:stopAutomation',
    z.object({
      automationId: z.string(),
    }),
    async (_event, request) => {
      const stopped = tradeTools.stopAutomation(request.automationId);
      return { success: stopped, automationId: request.automationId };
    }
  );

  // Stop all automations
  registerHandler(
    'regen:trade:stopAllAutomations',
    z.object({
      userId: z.string(),
    }),
    async (_event, request) => {
      const count = tradeTools.stopAllAutomations(request.userId);
      return { success: true, stoppedCount: count };
    }
  );

  // List automations
  registerHandler(
    'regen:trade:listAutomations',
    z.object({
      userId: z.string(),
    }),
    async (_event, request) => {
      const automations = tradeTools.listAutomations(request.userId);
      return { success: true, automations };
    }
  );

  log.info('Trade Mode IPC handlers registered');
}
