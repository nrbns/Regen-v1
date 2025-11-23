/**
 * Trade Mode Handler
 * Natural language trading + automation
 */

import { createLogger } from '../../utils/logger';
import type { RegenMessage, RegenResponse } from '../core';
import type { LanguageCode } from '../language/detector';
import { getResponseLanguage } from '../session';

const log = createLogger('regen-trade');

export interface TradeIntent {
  type:
    | 'buy'
    | 'sell'
    | 'set_sl'
    | 'set_target'
    | 'create_automation'
    | 'stop_automation'
    | 'list_automations';
  symbol?: string;
  quantity?: number;
  price?: number;
  orderType?: 'market' | 'limit';
  stopLoss?: number;
  target?: number;
  automationId?: string;
}

/**
 * Parse trade command from natural language
 */
export function parseTradeCommand(message: string): TradeIntent | null {
  const lower = message.toLowerCase();

  // Buy orders
  if (lower.includes('buy') || lower.includes('purchase')) {
    const symbolMatch = message.match(/(?:buy|purchase)\s+(\d+)\s+shares?\s+of\s+([A-Z]+)/i);
    if (symbolMatch) {
      return {
        type: 'buy',
        quantity: parseInt(symbolMatch[1], 10),
        symbol: symbolMatch[2],
        orderType: lower.includes('market') ? 'market' : 'limit',
      };
    }
  }

  // Stop loss
  if (lower.includes('stop loss') || lower.includes('sl')) {
    const percentMatch = message.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      return {
        type: 'set_sl',
        stopLoss: parseFloat(percentMatch[1]),
      };
    }
  }

  // Target
  if (lower.includes('target') || lower.includes('take profit')) {
    const percentMatch = message.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      return {
        type: 'set_target',
        target: parseFloat(percentMatch[1]),
      };
    }
  }

  // Automation commands
  if (lower.includes('stop') && lower.includes('automation')) {
    return { type: 'stop_automation' };
  }
  if (lower.includes('list') && lower.includes('automation')) {
    return { type: 'list_automations' };
  }
  if (lower.includes('create') || lower.includes('set up') || lower.includes('automate')) {
    return { type: 'create_automation' };
  }

  return null;
}

/**
 * Handle trade mode queries
 */
export async function handleTradeQuery(
  msg: RegenMessage,
  detectedLang: LanguageCode
): Promise<RegenResponse> {
  log.info('Handling trade query', { message: msg.message, language: detectedLang });

  const tradeIntent = parseTradeCommand(msg.message);
  const _responseLang = getResponseLanguage(msg.sessionId);

  const response: RegenResponse = {
    intent: 'trade',
    text: '',
    commands: [],
    metadata: {},
  };

  if (!tradeIntent) {
    response.text =
      'I can help you with trading commands. Try:\n- "Buy 10 shares of TCS at market"\n- "Set SL at 1% and target 3%"\n- "Create automation: if NIFTY breaks 22,000, buy 5 shares"';
    return response;
  }

  switch (tradeIntent.type) {
    case 'buy':
    case 'sell': {
      // Always require confirmation
      response.text = `⚠️ **Confirmation Required**\n\nYou are about to ${tradeIntent.type.toUpperCase()} ${tradeIntent.quantity} shares of ${tradeIntent.symbol} at ${tradeIntent.orderType || 'market'} price.\n\n**Type "Yes" to confirm, or "No" to cancel.**`;
      response.metadata = {
        pendingOrder: tradeIntent,
        requiresConfirmation: true,
      };
      break;
    }

    case 'set_sl': {
      response.text = `Setting stop loss at ${tradeIntent.stopLoss}% for your current position.`;
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'set_stop_loss', value: tradeIntent.stopLoss },
        },
      ];
      break;
    }

    case 'set_target': {
      response.text = `Setting target at ${tradeIntent.target}% for your current position.`;
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'set_target', value: tradeIntent.target },
        },
      ];
      break;
    }

    case 'create_automation': {
      response.text =
        'I can help you create an automation. Please describe the condition and action, for example:\n\n"If NIFTY 50 crosses 22,000 with volume > 2x average, buy 10 shares"\n\nor\n\n"If TCS falls 2%, exit position"';
      break;
    }

    case 'stop_automation': {
      response.text = 'Stopping all active automations...';
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'stop_all_automations' },
        },
      ];
      break;
    }

    case 'list_automations': {
      response.text = 'Fetching your active automations...';
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'list_automations' },
        },
      ];
      break;
    }
  }

  return response;
}
