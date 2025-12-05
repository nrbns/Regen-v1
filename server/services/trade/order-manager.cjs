/**
 * Order Management System
 * Handles order placement, tracking, and lifecycle with idempotency
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const Pino = require('pino');

const logger = Pino({ name: 'order-manager' });

class OrderManager extends EventEmitter {
  constructor() {
    super();
    this.orders = new Map(); // orderId -> Order
    this.idempotencyKeys = new Map(); // key -> orderId
    this.isPaperTrading = process.env.PAPER_TRADING !== 'false';
  }

  /**
   * Place order with idempotency
   */
  async placeOrder(orderData, idempotencyKey = null) {
    // Check idempotency
    if (idempotencyKey) {
      const existingOrderId = this.idempotencyKeys.get(idempotencyKey);
      if (existingOrderId) {
        const existingOrder = this.orders.get(existingOrderId);
        if (existingOrder) {
          logger.info({ idempotencyKey, orderId: existingOrderId }, 'Returning existing order (idempotency)');
          return existingOrder;
        }
      }
    }

    // Generate order ID
    const orderId = uuidv4();
    const order = {
      id: orderId,
      symbol: orderData.symbol,
      side: orderData.side, // 'buy' or 'sell'
      type: orderData.type || 'market', // 'market', 'limit', 'stop'
      quantity: orderData.quantity,
      price: orderData.price, // For limit orders
      stopPrice: orderData.stopPrice, // For stop orders
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filledQuantity: 0,
      averageFillPrice: null,
      paperTrading: this.isPaperTrading,
      ...orderData,
    };

    // Store order
    this.orders.set(orderId, order);
    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, orderId);
    }

    logger.info({ orderId, symbol: order.symbol, side: order.side }, 'Order placed');

    // Emit order created event
    this.emit('order:created', order);

    // Process order (async)
    this._processOrder(order).catch(err => {
      logger.error({ orderId, error: err.message }, 'Order processing failed');
      this._updateOrderStatus(orderId, 'rejected', err.message);
    });

    return order;
  }

  /**
   * Process order (simulate fill for paper trading)
   */
  async _processOrder(order) {
    // Update status to processing
    this._updateOrderStatus(order.id, 'processing');

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.isPaperTrading) {
      // Paper trading: simulate fill
      await this._simulateFill(order);
    } else {
      // Real trading: send to exchange
      // TODO: Implement real exchange integration
      throw new Error('Real trading not yet implemented');
    }
  }

  /**
   * Simulate order fill (paper trading)
   */
  async _simulateFill(order) {
    // Import here to avoid circular dependency
    let marketFeed;
    try {
      const marketFeedModule = require('./market-feed.cjs');
      marketFeed = marketFeedModule.getMarketFeed();
    } catch (error) {
      // Fallback if market feed not available
      logger.warn({ error: error.message }, 'Market feed not available, using default price');
      const currentPrice = order.price || 50000;
      const fillPrice = order.side === 'buy' ? currentPrice * 1.001 : currentPrice * 0.999;
      
      this._updateOrderStatus(order.id, 'filled', {
        filledQuantity: order.quantity,
        averageFillPrice: fillPrice,
      });
      return;
    }
    
    // Get current market price
    const currentPrice = marketFeed.getPrice(order.symbol) || order.price || 50000;
    
    // Simulate fill price (with slight slippage)
    const slippage = order.type === 'market' ? 0.001 : 0; // 0.1% slippage for market orders
    const fillPrice = order.side === 'buy' 
      ? currentPrice * (1 + slippage)
      : currentPrice * (1 - slippage);

    // For limit orders, check if price is acceptable
    if (order.type === 'limit') {
      if (order.side === 'buy' && fillPrice > order.price) {
        // Limit not met, keep as pending
        this._updateOrderStatus(order.id, 'pending');
        return;
      }
      if (order.side === 'sell' && fillPrice < order.price) {
        // Limit not met, keep as pending
        this._updateOrderStatus(order.id, 'pending');
        return;
      }
    }

    // Fill order
    this._updateOrderStatus(order.id, 'filled', {
      filledQuantity: order.quantity,
      averageFillPrice: fillPrice,
    });

    logger.info({ 
      orderId: order.id, 
      symbol: order.symbol,
      fillPrice,
      quantity: order.quantity,
    }, 'Order filled (paper trading)');
  }

  /**
   * Update order status
   */
  _updateOrderStatus(orderId, status, updates = {}) {
    const order = this.orders.get(orderId);
    if (!order) {
      return;
    }

    order.status = status;
    order.updatedAt = Date.now();
    Object.assign(order, updates);

    this.orders.set(orderId, order);

    // Emit status update
    this.emit('order:updated', order);

    logger.debug({ orderId, status }, 'Order status updated');
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }

    this._updateOrderStatus(orderId, 'cancelled');
    logger.info({ orderId }, 'Order cancelled');

    return order;
  }

  /**
   * Get order
   */
  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  /**
   * Get orders by symbol
   */
  getOrdersBySymbol(symbol) {
    return Array.from(this.orders.values())
      .filter(order => order.symbol === symbol)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status) {
    return Array.from(this.orders.values())
      .filter(order => order.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get all orders
   */
  getAllOrders() {
    return Array.from(this.orders.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters = {}) {
    let orders = Array.from(this.orders.values());

    // Filter by sessionId if provided
    if (filters.sessionId) {
      orders = orders.filter(order => order.sessionId === filters.sessionId);
    }

    // Filter by symbol if provided
    if (filters.symbol) {
      orders = orders.filter(order => order.symbol === filters.symbol);
    }

    // Filter by status if provided
    if (filters.status) {
      orders = orders.filter(order => order.status === filters.status);
    }

    // Filter by side if provided
    if (filters.side) {
      orders = orders.filter(order => order.side === filters.side);
    }

    // Sort by creation date (newest first)
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }
}

// Singleton instance
let orderManagerInstance = null;

function getOrderManager() {
  if (!orderManagerInstance) {
    orderManagerInstance = new OrderManager();
  }
  return orderManagerInstance;
}

module.exports = { OrderManager, getOrderManager };

