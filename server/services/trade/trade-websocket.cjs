/**
 * Trade WebSocket Server
 * Real-time market data and order updates
 */

const { WebSocketServer } = require('ws');
const { getMarketFeed } = require('./market-feed.cjs');
const { getOrderManager } = require('./order-manager.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'trade-websocket' });

function createTradeWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/trade' });
  const marketFeed = getMarketFeed();
  const orderManager = getOrderManager();

  wss.on('connection', (ws, req) => {
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId') || 
                      `trade-${Date.now()}`;
    
    logger.info({ sessionId }, 'Trade WebSocket connected');

    const subscriptions = new Set(); // Track subscribed symbols

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      message: 'Connected to trade stream',
    }));

    // Market data event handlers
    const ohlcHandler = (data) => {
      if (subscriptions.has(data.symbol)) {
        ws.send(JSON.stringify({
          type: 'ohlc',
          data,
        }));
      }
    };

    const orderbookHandler = (data) => {
      if (subscriptions.has(data.symbol)) {
        ws.send(JSON.stringify({
          type: 'orderbook',
          data,
        }));
      }
    };

    const tradeHandler = (data) => {
      if (subscriptions.has(data.symbol)) {
        ws.send(JSON.stringify({
          type: 'trade',
          data,
        }));
      }
    };

    // Order event handlers
    const orderCreatedHandler = (order) => {
      ws.send(JSON.stringify({
        type: 'order:created',
        order,
      }));
    };

    const orderUpdatedHandler = (order) => {
      ws.send(JSON.stringify({
        type: 'order:updated',
        order,
      }));
    };

    // Subscribe to events
    marketFeed.on('ohlc', ohlcHandler);
    marketFeed.on('orderbook', orderbookHandler);
    marketFeed.on('trade', tradeHandler);
    orderManager.on('order:created', orderCreatedHandler);
    orderManager.on('order:updated', orderUpdatedHandler);

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, symbol, order, idempotencyKey } = data;

        switch (type) {
          case 'subscribe':
            // Subscribe to symbol
            if (symbol) {
              subscriptions.add(symbol);
              marketFeed.subscribe(symbol);
              
              // Send historical data
              const historical = await marketFeed.getHistorical(symbol, '1h', 2000);
              ws.send(JSON.stringify({
                type: 'historical',
                symbol,
                data: historical,
              }));

              ws.send(JSON.stringify({
                type: 'subscribed',
                symbol,
              }));
            }
            break;

          case 'unsubscribe':
            // Unsubscribe from symbol
            if (symbol) {
              subscriptions.delete(symbol);
              marketFeed.unsubscribe(symbol);
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                symbol,
              }));
            }
            break;

          case 'place_order':
            // Place order
            try {
              const placedOrder = await orderManager.placeOrder(order, idempotencyKey);
              ws.send(JSON.stringify({
                type: 'order:placed',
                order: placedOrder,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'order:error',
                error: error.message,
              }));
            }
            break;

          case 'cancel_order':
            // Cancel order
            try {
              const cancelledOrder = await orderManager.cancelOrder(order.id);
              ws.send(JSON.stringify({
                type: 'order:cancelled',
                order: cancelledOrder,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'order:error',
                error: error.message,
              }));
            }
            break;

          case 'get_orders':
            // Get orders
            const orders = symbol 
              ? orderManager.getOrdersBySymbol(symbol)
              : orderManager.getAllOrders();
            ws.send(JSON.stringify({
              type: 'orders',
              orders,
            }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown command: ${type}`,
            }));
        }
      } catch (error) {
        logger.error({ sessionId, error: error.message }, 'Trade WebSocket message error');
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.info({ sessionId }, 'Trade WebSocket disconnected');
      
      // Unsubscribe from all symbols
      for (const symbol of subscriptions) {
        marketFeed.unsubscribe(symbol);
      }
      subscriptions.clear();

      // Remove event listeners
      marketFeed.off('ohlc', ohlcHandler);
      marketFeed.off('orderbook', orderbookHandler);
      marketFeed.off('trade', tradeHandler);
      orderManager.off('order:created', orderCreatedHandler);
      orderManager.off('order:updated', orderUpdatedHandler);
    });

    ws.on('error', (error) => {
      logger.error({ sessionId, error: error.message }, 'Trade WebSocket error');
    });
  });

  logger.info('Trade WebSocket server created');
  return wss;
}

module.exports = { createTradeWebSocket };








