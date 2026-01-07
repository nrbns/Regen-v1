#!/usr/bin/env node
/**
 * Realtime Message Bus Server
 * Single WebSocket server for all agent ↔ UI ↔ renderer communication
 * PR: Realtime backbone foundation
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.BUS_PORT || 4002;
const HOST = process.env.BUS_HOST || '0.0.0.0';

// Message bus state
const channels = new Map(); // channel -> Set<WebSocket>
const clients = new Map(); // ws -> { id, channels, metadata }
const messageHistory = new Map(); // channel -> Array<{timestamp, message}>
const MAX_HISTORY = 100;

// Metrics
const metrics = {
  messagesTotal: 0,
  messagesByChannel: new Map(),
  connectionsTotal: 0,
  activeConnections: 0,
  errors: 0,
};

/**
 * Create HTTP server
 */
const server = http.createServer();

/**
 * Create WebSocket server
 */
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false, // Disable compression for lower latency
});

/**
 * Subscribe client to channel
 */
function subscribe(client, channel) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel).add(client);
  
  const clientInfo = clients.get(client);
  if (clientInfo) {
    clientInfo.channels.add(channel);
  }
  
  // Send recent history if available
  const history = messageHistory.get(channel);
  if (history && history.length > 0) {
    const recent = history.slice(-10); // Last 10 messages
    client.send(JSON.stringify({
      type: 'history',
      channel,
      messages: recent,
    }));
  }
  
  console.log(`[Bus] Client ${clientInfo?.id || 'unknown'} subscribed to ${channel}`);
}

/**
 * Unsubscribe client from channel
 */
function unsubscribe(client, channel) {
  const channelClients = channels.get(channel);
  if (channelClients) {
    channelClients.delete(client);
    if (channelClients.size === 0) {
      channels.delete(channel);
    }
  }
  
  const clientInfo = clients.get(client);
  if (clientInfo) {
    clientInfo.channels.delete(channel);
  }
}

/**
 * Publish message to channel
 */
function publish(channel, message, sender = null) {
  const channelClients = channels.get(channel);
  if (!channelClients || channelClients.size === 0) {
    return 0; // No subscribers
  }
  
  const payload = {
    type: 'message',
    channel,
    timestamp: Date.now(),
    data: message,
    sender: sender || 'system',
  };
  
  const payloadStr = JSON.stringify(payload);
  let delivered = 0;
  
  // Broadcast to all subscribers
  channelClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payloadStr);
        delivered++;
      } catch (error) {
        console.error(`[Bus] Failed to send to client:`, error);
        metrics.errors++;
      }
    }
  });
  
  // Store in history
  if (!messageHistory.has(channel)) {
    messageHistory.set(channel, []);
  }
  const history = messageHistory.get(channel);
  history.push({
    timestamp: payload.timestamp,
    message: payload.data,
  });
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  
  // Update metrics
  metrics.messagesTotal++;
  metrics.messagesByChannel.set(channel, (metrics.messagesByChannel.get(channel) || 0) + 1);
  
  return delivered;
}

/**
 * Handle WebSocket connection
 */
wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const query = url.parse(req.url, true).query;
  const metadata = {
    id: clientId,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    ...query,
  };
  
  clients.set(ws, {
    id: clientId,
    channels: new Set(),
    metadata,
    connectedAt: Date.now(),
  });
  
  metrics.connectionsTotal++;
  metrics.activeConnections++;
  
  console.log(`[Bus] Client connected: ${clientId}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: Date.now(),
    server: 'realtime-bus',
    version: '1.0.0',
  }));
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          if (message.channel) {
            subscribe(ws, message.channel);
            ws.send(JSON.stringify({
              type: 'subscribed',
              channel: message.channel,
            }));
          }
          break;
          
        case 'unsubscribe':
          if (message.channel) {
            unsubscribe(ws, message.channel);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              channel: message.channel,
            }));
          }
          break;
          
        case 'publish':
          if (message.channel && message.data) {
            const clientInfo = clients.get(ws);
            const delivered = publish(message.channel, message.data, clientInfo?.id);
            ws.send(JSON.stringify({
              type: 'published',
              channel: message.channel,
              delivered,
            }));
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
          }));
          break;
          
        case 'get_metrics':
          ws.send(JSON.stringify({
            type: 'metrics',
            metrics: {
              ...metrics,
              activeChannels: channels.size,
              messagesByChannel: Object.fromEntries(metrics.messagesByChannel),
            },
          }));
          break;
          
        default:
          console.warn(`[Bus] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[Bus] Message parse error:`, error);
      metrics.errors++;
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
      }));
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      // Unsubscribe from all channels
      clientInfo.channels.forEach(channel => {
        unsubscribe(ws, channel);
      });
      clients.delete(ws);
    }
    metrics.activeConnections--;
    console.log(`[Bus] Client disconnected: ${clientId}`);
  });
  
  ws.on('error', (error) => {
    console.error(`[Bus] WebSocket error:`, error);
    metrics.errors++;
  });
});

/**
 * Health check endpoint
 */
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      metrics: {
        activeConnections: metrics.activeConnections,
        totalConnections: metrics.connectionsTotal,
        totalMessages: metrics.messagesTotal,
        activeChannels: channels.size,
      },
    }));
    return;
  }
  
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...metrics,
      activeChannels: channels.size,
      messagesByChannel: Object.fromEntries(metrics.messagesByChannel),
      clients: Array.from(clients.values()).map(c => ({
        id: c.id,
        channels: Array.from(c.channels),
        connectedAt: c.connectedAt,
      })),
    }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

/**
 * Start server
 */
server.listen(PORT, HOST, () => {
  console.log(`🚀 Realtime Bus Server running on ws://${HOST}:${PORT}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/health`);
  console.log(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Bus] Shutting down...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

