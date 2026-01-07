/**
 * Trade Adapter - Unified interface for trading with risk engine
 * PR: Enhanced trade adapter with risk checks
 */

export interface TradeOrder {
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeResult {
  orderId: string;
  success: boolean;
  filledQuantity?: number;
  averagePrice?: number;
  error?: string;
  timestamp: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

export interface AccountState {
  balance: number;
  equity: number;
  marginUsed: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
  }>;
}

// In-memory ledger for paper trading
const ledger: Array<{
  orderId: string;
  order: TradeOrder;
  result: TradeResult;
  timestamp: number;
}> = [];

/**
 * Risk check engine
 */
export function riskCheck(
  order: TradeOrder,
  accountState: AccountState = { balance: 100000, equity: 100000, marginUsed: 0, positions: [] }
): RiskCheckResult {
  const warnings: string[] = [];
  let allowed = true;
  let reason: string | undefined;

  // Check 1: Sufficient balance
  const estimatedCost = order.quantity * (order.price || 100); // Rough estimate
  if (order.side === 'buy' && estimatedCost > accountState.balance * 0.9) {
    allowed = false;
    reason = 'Insufficient balance (would use >90% of account)';
  }

  // Check 2: Position size limits
  const maxPositionSize = accountState.equity * 0.1; // Max 10% per position
  if (estimatedCost > maxPositionSize) {
    warnings.push(`Position size (${estimatedCost}) exceeds 10% of equity`);
    if (estimatedCost > accountState.equity * 0.2) {
      allowed = false;
      reason = 'Position size exceeds 20% of equity';
    }
  }

  // Check 3: Stop loss required for large positions
  if (estimatedCost > accountState.equity * 0.05 && !order.stopLoss) {
    warnings.push('Stop loss recommended for positions >5% of equity');
  }

  // Check 4: Quantity validation
  if (order.quantity <= 0) {
    allowed = false;
    reason = 'Invalid quantity (must be > 0)';
  }

  // Check 5: Price validation for limit orders
  if (order.orderType === 'limit' && !order.price) {
    allowed = false;
    reason = 'Limit order requires price';
  }

  // Check 6: Existing position check
  const existingPosition = accountState.positions.find(p => p.symbol === order.symbol);
  if (existingPosition) {
    const totalExposure = existingPosition.quantity * existingPosition.avgPrice + estimatedCost;
    if (totalExposure > accountState.equity * 0.15) {
      warnings.push(`Total exposure to ${order.symbol} would exceed 15% of equity`);
    }
  }

  return { allowed, reason, warnings };
}

/**
 * Place order (paper trading by default)
 */
export async function placeOrder(order: TradeOrder): Promise<TradeResult> {
  // Risk check
  const accountState = getAccountState();
  const riskResult = riskCheck(order, accountState);

  if (!riskResult.allowed) {
    return {
      orderId: `rejected-${Date.now()}`,
      success: false,
      error: riskResult.reason || 'Risk check failed',
      timestamp: Date.now(),
    };
  }

  // Log warnings
  if (riskResult.warnings.length > 0) {
    console.warn('[TradeAdapter] Risk warnings:', riskResult.warnings);
  }

  // Simulate order execution (paper trading)
  const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const averagePrice = order.price || (order.side === 'buy' ? 100 : 99); // Mock price
  const filledQuantity = order.quantity;

  const result: TradeResult = {
    orderId,
    success: true,
    filledQuantity,
    averagePrice,
    timestamp: Date.now(),
  };

  // Record in ledger
  ledger.push({
    orderId,
    order,
    result,
    timestamp: Date.now(),
  });

  // Update account state (simplified)
  if (order.side === 'buy') {
    accountState.balance -= filledQuantity * averagePrice;
  } else {
    accountState.balance += filledQuantity * averagePrice;
  }

  return result;
}

/**
 * Get account state
 */
export function getAccountState(): AccountState {
  // Calculate from ledger
  let balance = 100000; // Starting balance
  const positions: AccountState['positions'] = [];

  for (const entry of ledger) {
    const { order, result } = entry;
    if (result.success && result.filledQuantity && result.averagePrice) {
      if (order.side === 'buy') {
        balance -= result.filledQuantity * result.averagePrice;
        const existing = positions.find(p => p.symbol === order.symbol);
        if (existing) {
          // Update average price
          const totalQty = existing.quantity + result.filledQuantity;
          const totalCost =
            existing.quantity * existing.avgPrice + result.filledQuantity * result.averagePrice;
          existing.quantity = totalQty;
          existing.avgPrice = totalCost / totalQty;
        } else {
          positions.push({
            symbol: order.symbol,
            quantity: result.filledQuantity,
            avgPrice: result.averagePrice,
          });
        }
      } else {
        balance += result.filledQuantity * result.averagePrice;
        const existing = positions.find(p => p.symbol === order.symbol);
        if (existing) {
          existing.quantity -= result.filledQuantity;
          if (existing.quantity <= 0) {
            const index = positions.indexOf(existing);
            positions.splice(index, 1);
          }
        }
      }
    }
  }

  return {
    balance,
    equity: balance, // Simplified
    marginUsed: 0,
    positions,
  };
}

/**
 * Get trade ledger (recent trades)
 */
export function getLedger(limit: number = 50): typeof ledger {
  return ledger.slice(-limit);
}

/**
 * Clear ledger (for testing)
 */
export function clearLedger(): void {
  ledger.length = 0;
}
