/**
 * Trade Mode Service
 * 
 * Main service for Trade Mode functionality including:
 * - Order Management System (OMS)
 * - Market data connections
 * - Risk management
 * - AI signal processing
 */

import { oms, Order } from './oms';
import { getMarketDataService } from './market-data';
import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';

// Market data service instance (initialized on first use)
let marketDataService: ReturnType<typeof getMarketDataService> | null = null;

function getMarketData() {
  if (!marketDataService) {
    marketDataService = getMarketDataService({ provider: 'mock' });
    marketDataService.connect().catch(console.error);
  }
  return marketDataService;
}

// Register IPC handlers for Trade Mode
export function registerTradeIpc() {
  // Orders
  registerHandler('trade:placeOrder', z.any(), async (_event, data: Omit<Order, 'id' | 'createdAt' | 'status' | 'auditLog'>) => {
    const orderId = await oms.placeOrder(data);
    return { orderId };
  });

  registerHandler('trade:cancelOrder', z.object({ orderId: z.string() }), async (_event, data) => {
    await oms.cancelOrder(data.orderId);
    return { success: true };
  });

  registerHandler('trade:getOrders', z.object({ status: z.string().optional() }).optional(), async (_event, data) => {
    const orders = await oms.getOrders(data?.status);
    return { orders };
  });

  // Positions
  registerHandler('trade:getPositions', z.object({}), async (_event) => {
    const positions = await oms.getPositions();
    return { positions };
  });

  registerHandler('trade:closePosition', z.object({ symbol: z.string(), quantity: z.number().optional() }), async (_event, data) => {
    try {
      // closePosition might not exist, use placeOrder with sell side instead
      const orderId = await oms.placeOrder({
        symbol: data.symbol,
        side: 'sell',
        quantity: data.quantity ?? 0,
        filledQuantity: 0,
        orderType: 'market',
        paper: true,
      });
      return { success: true, orderId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Balance
  registerHandler('trade:getBalance', z.object({}), async (_event) => {
    const balance = await oms.getBalance();
    return balance;
  });

  // Broker connections
  registerHandler('trade:connectBroker', z.object({
    brokerId: z.string(),
    apiKey: z.string(),
    apiSecret: z.string(),
    paper: z.boolean(),
  }), async (_event, data) => {
    await oms.connectBroker(data.brokerId, data.apiKey, data.apiSecret, data.paper);
    return { success: true };
  });

  // Market data
  registerHandler('trade:getQuote', z.object({ symbol: z.string() }), async (_event, data) => {
    const marketData = getMarketData();
    const quote = await marketData.getQuote(data.symbol);
    return quote;
  });

  registerHandler('trade:getCandles', z.object({
    symbol: z.string(),
    timeframe: z.string(),
    from: z.number(),
    to: z.number(),
  }), async (_event, data) => {
    const marketData = getMarketData();
    const candles = await marketData.getCandles(data.symbol, data.timeframe, data.from, data.to);
    return { candles };
  });

  // Subscribe to real-time quotes
  const marketData = getMarketData();
  marketData.on('quote', (_quote) => {
    // Emit to renderer via IPC event
    // TODO: Implement IPC event emission for real-time updates
  });
}

