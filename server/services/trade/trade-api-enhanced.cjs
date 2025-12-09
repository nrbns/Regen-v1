/**
 * Enhanced Trade API
 * REST endpoints for trading operations
 */

const express = require('express');
const { getMarketFeed } = require('./market-feed.cjs');
const { getOrderManager } = require('./order-manager.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'trade-api-enhanced' });
const router = express.Router();

/**
 * GET /api/trade/historical/:symbol
 * Get historical OHLC data
 */
router.get('/historical/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { timeframe = '1h', limit = 2000 } = req.query;

  try {
    const marketFeed = getMarketFeed();
    const data = await marketFeed.getHistorical(symbol, timeframe, parseInt(limit));
    
    res.json({
      success: true,
      symbol,
      timeframe,
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error({ symbol, error: error.message }, 'Failed to get historical data');
    res.status(500).json({
      error: 'Failed to get historical data',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade/orderbook/:symbol
 * Get current orderbook
 */
router.get('/orderbook/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const marketFeed = getMarketFeed();
    const orderbook = marketFeed.getOrderbook(symbol);
    
    if (!orderbook) {
      return res.status(404).json({
        error: 'Orderbook not found',
      });
    }

    res.json({
      success: true,
      orderbook,
    });
  } catch (error) {
    logger.error({ symbol, error: error.message }, 'Failed to get orderbook');
    res.status(500).json({
      error: 'Failed to get orderbook',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade/price/:symbol
 * Get latest price
 */
router.get('/price/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const marketFeed = getMarketFeed();
    const price = marketFeed.getPrice(symbol);
    
    if (price === null) {
      return res.status(404).json({
        error: 'Price not found',
      });
    }

    res.json({
      success: true,
      symbol,
      price,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ symbol, error: error.message }, 'Failed to get price');
    res.status(500).json({
      error: 'Failed to get price',
      message: error.message,
    });
  }
});

/**
 * POST /api/trade/order
 * Place order
 */
router.post('/order', async (req, res) => {
  const { order, idempotencyKey } = req.body;

  if (!order || !order.symbol || !order.side || !order.quantity) {
    return res.status(400).json({
      error: 'Invalid order data',
    });
  }

  try {
    const orderManager = getOrderManager();
    const placedOrder = await orderManager.placeOrder(order, idempotencyKey);
    
    res.json({
      success: true,
      order: placedOrder,
    });
  } catch (error) {
    logger.error({ order, error: error.message }, 'Failed to place order');
    res.status(500).json({
      error: 'Failed to place order',
      message: error.message,
    });
  }
});

/**
 * POST /api/trade/order/:orderId/cancel
 * Cancel order
 */
router.post('/order/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;

  try {
    const orderManager = getOrderManager();
    const cancelledOrder = await orderManager.cancelOrder(orderId);
    
    res.json({
      success: true,
      order: cancelledOrder,
    });
  } catch (error) {
    logger.error({ orderId, error: error.message }, 'Failed to cancel order');
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade/order/:orderId
 * Get order
 */
router.get('/order/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const orderManager = getOrderManager();
    const order = orderManager.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    logger.error({ orderId, error: error.message }, 'Failed to get order');
    res.status(500).json({
      error: 'Failed to get order',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade/orders
 * Get orders
 */
router.get('/orders', async (req, res) => {
  const { symbol, status } = req.query;

  try {
    const orderManager = getOrderManager();
    let orders;

    if (symbol) {
      orders = orderManager.getOrdersBySymbol(symbol);
    } else if (status) {
      orders = orderManager.getOrdersByStatus(status);
    } else {
      orders = orderManager.getAllOrders();
    }

    res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get orders');
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade/health
 * Health check
 */
router.get('/health', (req, res) => {
  const marketFeed = getMarketFeed();
  const orderManager = getOrderManager();
  
  res.json({
    status: 'ok',
    service: 'trade-api',
    paperTrading: orderManager.isPaperTrading,
    marketFeedRunning: marketFeed.isRunning,
    timestamp: Date.now(),
  });
});

module.exports = router;








