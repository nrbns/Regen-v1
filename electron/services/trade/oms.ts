/**
 * Order Management System (OMS)
 * 
 * Abstracts broker integrations (Alpaca, IBKR, Binance) and provides
 * unified interface for paper trading, live execution, and risk management.
 */

import { EventEmitter } from 'events';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { app } from 'electron';

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: 'pending' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  limitPrice?: number;
  stopPrice?: number;
  averageFillPrice?: number;
  createdAt: number;
  filledAt?: number;
  brokerOrderId?: string;
  paper: boolean;
  aiSignalId?: string;
  bracket?: {
    stopLoss: number;
    takeProfit: number;
  };
  trailingStop?: {
    distance: number;
    distanceType: 'price' | 'percent' | 'atr';
    activationPrice?: number;
  };
  auditLog: Array<{
    timestamp: number;
    event: string;
    details: any;
  }>;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss?: number;
  takeProfit?: number;
  entryOrderId: string;
  paper: boolean;
}

export interface BrokerAdapter {
  connect(apiKey: string, apiSecret: string, paper: boolean): Promise<void>;
  disconnect(): Promise<void>;
  getBalance(): Promise<{ cash: number; buyingPower: number; portfolioValue: number }>;
  placeOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'auditLog'>): Promise<string>;
  cancelOrder(orderId: string): Promise<void>;
  getPositions(): Promise<Position[]>;
  getOrders(status?: string): Promise<Order[]>;
}

export class PaperTradingAdapter implements BrokerAdapter {
  private balance = 100000; // Starting paper balance
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private eventEmitter = new EventEmitter();

  async connect(_apiKey: string, _apiSecret: string, _paper: boolean): Promise<void> {
    // Load saved state
    await this.loadState();
  }

  async disconnect(): Promise<void> {
    await this.saveState();
  }

  async getBalance(): Promise<{ cash: number; buyingPower: number; portfolioValue: number }> {
    const portfolioValue = Array.from(this.positions.values()).reduce(
      (sum, pos) => sum + pos.quantity * pos.currentPrice,
      this.balance
    );
    return {
      cash: this.balance,
      buyingPower: this.balance * 2, // 2x margin for paper trading
      portfolioValue,
    };
  }

  async placeOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'auditLog'>): Promise<string> {
    const order: Order = {
      ...orderData,
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      status: 'pending',
      filledQuantity: 0,
      auditLog: [
        {
          timestamp: Date.now(),
          event: 'order_created',
          details: { ...orderData },
        },
      ],
    };

    this.orders.set(order.id, order);

    // Simulate order execution
    setTimeout(() => {
      this.executeOrder(order);
    }, 100);

    return order.id;
  }

  private executeOrder(order: Order): void {
    const fillPrice = order.limitPrice || order.stopPrice || 150; // Mock price
    const cost = fillPrice * order.quantity;

    if (order.side === 'buy') {
      if (this.balance < cost) {
        order.status = 'rejected';
        order.auditLog.push({
          timestamp: Date.now(),
          event: 'order_rejected',
          details: { reason: 'Insufficient funds' },
        });
        return;
      }
      this.balance -= cost;
    } else {
      this.balance += cost;
    }

    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.averageFillPrice = fillPrice;
    order.filledAt = Date.now();

    order.auditLog.push({
      timestamp: Date.now(),
      event: 'order_filled',
      details: { fillPrice, quantity: order.quantity },
    });

    // Update or create position
    const existingPos = this.positions.get(order.symbol);
    if (existingPos) {
      const totalCost = existingPos.averageEntryPrice * existingPos.quantity + fillPrice * order.quantity;
      const totalQuantity = existingPos.quantity + (order.side === 'buy' ? order.quantity : -order.quantity);
      existingPos.averageEntryPrice = totalCost / totalQuantity;
      existingPos.quantity = totalQuantity;
      if (existingPos.quantity === 0) {
        this.positions.delete(order.symbol);
      }
    } else if (order.side === 'buy') {
      const position: Position = {
        id: `pos-${Date.now()}`,
        symbol: order.symbol,
        quantity: order.quantity,
        averageEntryPrice: fillPrice,
        currentPrice: fillPrice,
        unrealizedPnL: 0,
        realizedPnL: 0,
        entryOrderId: order.id,
        paper: order.paper,
        stopLoss: order.bracket?.stopLoss,
        takeProfit: order.bracket?.takeProfit,
      };
      this.positions.set(order.symbol, position);
    }

    this.eventEmitter.emit('order_filled', order);
    this.saveState();
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      order.auditLog.push({
        timestamp: Date.now(),
        event: 'order_cancelled',
        details: {},
      });
    }
  }

  async getPositions(): Promise<Position[]> {
    // Update current prices and unrealized P&L
    const positions = Array.from(this.positions.values());
    for (const pos of positions) {
      // TODO: Get real-time price from market data service
      // For now, use a simple mock price update
      const priceChange = (Math.random() - 0.5) * 0.02; // ±1% variation
      pos.currentPrice = pos.averageEntryPrice * (1 + priceChange);
      pos.unrealizedPnL = (pos.currentPrice - pos.averageEntryPrice) * pos.quantity;
    }
    return positions;
  }

  async closePosition(symbol: string, quantity?: number): Promise<string> {
    const position = this.positions.get(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    const closeQuantity = quantity || position.quantity;
    if (closeQuantity > position.quantity) {
      throw new Error(`Cannot close more than position size: ${position.quantity}`);
    }

    // Create a market sell order to close the position
    const closeOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol: position.symbol,
      side: position.quantity > 0 ? 'sell' : 'buy', // Reverse the position
      quantity: closeQuantity,
      orderType: 'market',
      status: 'pending',
      filledQuantity: 0,
      createdAt: Date.now(),
      paper: position.paper,
      auditLog: [
        {
          timestamp: Date.now(),
          event: 'close_position_order_created',
          details: { positionId: position.id, quantity: closeQuantity },
        },
      ],
    };

    this.orders.set(closeOrder.id, closeOrder);

    // Execute immediately (market order)
    setTimeout(() => {
      this.executeCloseOrder(closeOrder, position, closeQuantity);
    }, 50);

    return closeOrder.id;
  }

  private executeCloseOrder(order: Order, position: Position, quantity: number): void {
    // Use current market price (mock)
    const fillPrice = position.currentPrice;
    const cost = fillPrice * quantity;

    // Update balance
    if (order.side === 'sell') {
      this.balance += cost;
    } else {
      this.balance -= cost;
    }

    // Calculate realized P&L
    const realizedPnL = (fillPrice - position.averageEntryPrice) * quantity * (order.side === 'sell' ? 1 : -1);
    position.realizedPnL += realizedPnL;

    // Update position quantity
    position.quantity -= quantity * (order.side === 'sell' ? 1 : -1);

    // Update order status
    order.status = 'filled';
    order.filledQuantity = quantity;
    order.averageFillPrice = fillPrice;
    order.filledAt = Date.now();

    order.auditLog.push({
      timestamp: Date.now(),
      event: 'position_closed',
      details: { fillPrice, quantity, realizedPnL },
    });

    // Remove position if fully closed
    if (Math.abs(position.quantity) < 0.01) {
      this.positions.delete(position.symbol);
    }

    this.eventEmitter.emit('position_closed', { position, order, realizedPnL });
    this.saveState();
  }

  async getOrders(status?: string): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    return status ? orders.filter((o) => o.status === status) : orders;
  }

  private async loadState(): Promise<void> {
    const statePath = path.join(app.getPath('userData'), 'trade', 'paper-state.json');
    try {
      if (fs.existsSync(statePath)) {
        const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        this.balance = data.balance || 100000;
        // Load positions and orders from state
      }
    } catch (error) {
      console.error('Failed to load paper trading state:', error);
    }
  }

  private async saveState(): Promise<void> {
    const statePath = path.join(app.getPath('userData'), 'trade', 'paper-state.json');
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    try {
      fs.writeFileSync(
        statePath,
        JSON.stringify(
          {
            balance: this.balance,
            positions: Array.from(this.positions.entries()),
            orders: Array.from(this.orders.entries()),
          },
          null,
          2
        )
      );
    } catch (error) {
      console.error('Failed to save paper trading state:', error);
    }
  }
}

export class OMS extends EventEmitter {
  private adapters: Map<string, BrokerAdapter> = new Map();
  private activeAdapter: BrokerAdapter | null = null;

  constructor() {
    super();
    // Initialize with paper trading adapter
    const paperAdapter = new PaperTradingAdapter();
    this.adapters.set('paper', paperAdapter);
    this.activeAdapter = paperAdapter;
  }

  async connectBroker(
    brokerId: string,
    apiKey: string,
    apiSecret: string,
    paper: boolean
  ): Promise<void> {
    // TODO: Implement real broker adapters (Alpaca, IBKR, Binance)
    // For now, use paper trading
    if (brokerId === 'paper' || paper) {
      const adapter = this.adapters.get('paper') || new PaperTradingAdapter();
      await adapter.connect(apiKey, apiSecret, paper);
      this.activeAdapter = adapter;
    }
  }

  async placeOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'auditLog'>): Promise<string> {
    if (!this.activeAdapter) {
      throw new Error('No active broker connection');
    }
    return this.activeAdapter.placeOrder(orderData);
  }

  async cancelOrder(orderId: string): Promise<void> {
    if (!this.activeAdapter) {
      throw new Error('No active broker connection');
    }
    return this.activeAdapter.cancelOrder(orderId);
  }

  async getPositions(): Promise<Position[]> {
    if (!this.activeAdapter) {
      return [];
    }
    return this.activeAdapter.getPositions();
  }

  async getOrders(status?: string): Promise<Order[]> {
    if (!this.activeAdapter) {
      return [];
    }
    return this.activeAdapter.getOrders(status);
  }

  async getBalance(): Promise<{ cash: number; buyingPower: number; portfolioValue: number }> {
    if (!this.activeAdapter) {
      return { cash: 0, buyingPower: 0, portfolioValue: 0 };
    }
    return this.activeAdapter.getBalance();
  }
}

// Singleton instance
export const oms = new OMS();

