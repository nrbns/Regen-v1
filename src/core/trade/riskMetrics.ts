/**
 * Risk Metrics Calculator
 * Phase 1, Day 7: Trade Mode Stability
 */

export interface RiskMetrics {
  positionSize: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  maxLoss: number;
  maxGain: number;
  marginRequired: number;
  leverage: number;
  positionValue: number;
  riskPercentage: number;
}

export interface PositionParams {
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  marginMultiplier?: number; // For leveraged positions
}

/**
 * Phase 1, Day 7: Calculate comprehensive risk metrics
 */
export function calculateRiskMetrics(params: PositionParams): RiskMetrics {
  const {
    entryPrice,
    quantity,
    stopLoss,
    takeProfit,
    orderType,
    side,
    marginMultiplier = 1,
  } = params;

  const positionValue = entryPrice * quantity;
  const marginRequired = orderType === 'market' ? positionValue * 0.1 * marginMultiplier : 0; // 10% margin for market orders
  const leverage = marginRequired > 0 ? positionValue / marginRequired : 1;

  // Calculate risk and reward
  let riskAmount = 0;
  let rewardAmount = 0;
  let maxLoss = 0;
  let maxGain = 0;

  if (stopLoss) {
    if (side === 'buy') {
      riskAmount = (entryPrice - stopLoss) * quantity;
      maxLoss = riskAmount;
    } else {
      // Short position
      riskAmount = (stopLoss - entryPrice) * quantity;
      maxLoss = riskAmount;
    }
  } else {
    // No stop loss - risk is entire position
    riskAmount = positionValue;
    maxLoss = positionValue;
  }

  if (takeProfit) {
    if (side === 'buy') {
      rewardAmount = (takeProfit - entryPrice) * quantity;
      maxGain = rewardAmount;
    } else {
      // Short position
      rewardAmount = (entryPrice - takeProfit) * quantity;
      maxGain = rewardAmount;
    }
  } else {
    // No take profit - unlimited gain potential
    maxGain = Infinity;
  }

  const riskRewardRatio = rewardAmount > 0 ? riskAmount / rewardAmount : Infinity;
  const riskPercentage = stopLoss ? (Math.abs(entryPrice - stopLoss) / entryPrice) * 100 : 100;

  return {
    positionSize: quantity,
    riskAmount,
    rewardAmount,
    riskRewardRatio: riskRewardRatio === Infinity ? 0 : riskRewardRatio,
    maxLoss,
    maxGain: maxGain === Infinity ? 0 : maxGain,
    marginRequired,
    leverage,
    positionValue,
    riskPercentage,
  };
}

/**
 * Phase 1, Day 7: Validate risk parameters
 */
export function validateRiskParams(params: PositionParams): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (params.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (params.entryPrice <= 0) {
    errors.push('Entry price must be greater than 0');
  }

  if (params.stopLoss) {
    if (params.side === 'buy' && params.stopLoss >= params.entryPrice) {
      errors.push('Stop loss must be below entry price for buy orders');
    }
    if (params.side === 'sell' && params.stopLoss <= params.entryPrice) {
      errors.push('Stop loss must be above entry price for sell orders');
    }
  }

  if (params.takeProfit) {
    if (params.side === 'buy' && params.takeProfit <= params.entryPrice) {
      errors.push('Take profit must be above entry price for buy orders');
    }
    if (params.side === 'sell' && params.takeProfit >= params.entryPrice) {
      errors.push('Take profit must be below entry price for sell orders');
    }
  }

  // Calculate metrics for warnings
  if (errors.length === 0) {
    const metrics = calculateRiskMetrics(params);

    if (metrics.riskPercentage > 10) {
      warnings.push('Risk percentage is high (>10%). Consider tighter stop loss.');
    }

    if (metrics.riskRewardRatio > 0 && metrics.riskRewardRatio > 3) {
      warnings.push('Risk/Reward ratio is unfavorable (>3:1). Consider adjusting take profit.');
    }

    if (metrics.riskRewardRatio > 0 && metrics.riskRewardRatio < 0.5) {
      warnings.push('Risk/Reward ratio is very favorable (<0.5:1). Verify stop loss is realistic.');
    }

    if (metrics.leverage > 10) {
      warnings.push('High leverage detected (>10x). This increases risk significantly.');
    }

    if (!params.stopLoss) {
      warnings.push('No stop loss set. This exposes you to unlimited downside risk.');
    }

    if (!params.takeProfit) {
      warnings.push('No take profit set. Consider setting a target to lock in gains.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Phase 1, Day 7: Calculate optimal position size based on risk
 */
export function calculateOptimalPositionSize(
  entryPrice: number,
  stopLoss: number,
  maxRiskAmount: number,
  side: 'buy' | 'sell'
): number {
  if (maxRiskAmount <= 0 || entryPrice <= 0 || stopLoss <= 0) {
    return 0;
  }

  let priceDifference: number;
  if (side === 'buy') {
    priceDifference = entryPrice - stopLoss;
  } else {
    priceDifference = stopLoss - entryPrice;
  }

  if (priceDifference <= 0) {
    return 0;
  }

  const optimalQuantity = Math.floor(maxRiskAmount / priceDifference);
  return Math.max(1, optimalQuantity); // At least 1 unit
}
