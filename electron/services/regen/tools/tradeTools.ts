/**
 * Trade Tools
 * Paper trading and broker integration
 */

import { createLogger } from '../../utils/logger';
import type { TradeIntent } from '../modes/trade';

const log = createLogger('regen-trade-tools');

interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled';
}

interface Automation {
  id: string;
  userId: string;
  symbol: string;
  condition: string;
  action: string;
  quantity?: number;
  enabled: boolean;
  createdAt: number;
}

// In-memory storage (in production, use database)
const paperTrades: PaperTrade[] = [];
const automations: Automation[] = [];

/**
 * Place a paper trade (virtual portfolio)
 */
export async function placePaperTrade(
  intent: TradeIntent
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    if (!intent.symbol || !intent.quantity) {
      return { success: false, error: 'Missing symbol or quantity' };
    }

    // Simulate market price (in production, fetch from broker API)
    const mockPrice = Math.random() * 1000 + 100; // Mock price between 100-1100

    const trade: PaperTrade = {
      id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: intent.symbol,
      side: intent.type === 'buy' ? 'buy' : 'sell',
      quantity: intent.quantity,
      price: intent.orderType === 'market' ? mockPrice : intent.price || mockPrice,
      timestamp: Date.now(),
      status: 'filled', // Paper trades fill immediately
    };

    paperTrades.push(trade);
    log.info('Paper trade placed', { tradeId: trade.id, symbol: trade.symbol });

    return { success: true, orderId: trade.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to place paper trade', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Get paper trading positions
 */
export function getPaperPositions(): PaperTrade[] {
  return paperTrades.filter(t => t.status === 'filled');
}

/**
 * Create automation rule
 */
export async function createAutomation(
  userId: string,
  symbol: string,
  condition: string,
  action: string,
  quantity?: number
): Promise<{ success: boolean; automationId?: string; error?: string }> {
  try {
    const automation: Automation = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      symbol,
      condition,
      action,
      quantity,
      enabled: true,
      createdAt: Date.now(),
    };

    automations.push(automation);
    log.info('Automation created', { automationId: automation.id, symbol });

    return { success: true, automationId: automation.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to create automation', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Stop automation
 */
export function stopAutomation(automationId: string): boolean {
  const automation = automations.find(a => a.id === automationId);
  if (automation) {
    automation.enabled = false;
    log.info('Automation stopped', { automationId });
    return true;
  }
  return false;
}

/**
 * Stop all automations for user
 */
export function stopAllAutomations(userId: string): number {
  const userAutomations = automations.filter(a => a.userId === userId && a.enabled);
  userAutomations.forEach(a => {
    a.enabled = false;
  });
  log.info('All automations stopped', { userId, count: userAutomations.length });
  return userAutomations.length;
}

/**
 * List automations for user
 */
export function listAutomations(userId: string): Automation[] {
  return automations.filter(a => a.userId === userId);
}
