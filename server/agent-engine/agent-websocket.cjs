/**
 * Agent WebSocket Server
 * Streams agent events to frontend in real-time
 */

const { WebSocketServer } = require('ws');
const { getAgentManager } = require('./agent-manager.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'agent-websocket' });

function createAgentWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/agent' });
  const agentManager = getAgentManager();

  wss.on('connection', (ws, req) => {
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId') || 
                      `ws-agent-${Date.now()}`;
    
    logger.info({ sessionId }, 'Agent WebSocket connected');

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      message: 'Connected to agent stream',
    }));

    // Register event listeners
    const eventHandlers = {
      'task:start': (data) => {
        ws.send(JSON.stringify({ type: 'task:start', ...data }));
      },
      'task:plan': (data) => {
        ws.send(JSON.stringify({ type: 'task:plan', ...data }));
      },
      'task:step:start': (data) => {
        ws.send(JSON.stringify({ type: 'task:step:start', ...data }));
      },
      'task:step:complete': (data) => {
        ws.send(JSON.stringify({ type: 'task:step:complete', ...data }));
      },
      'task:step:error': (data) => {
        ws.send(JSON.stringify({ type: 'task:step:error', ...data }));
      },
      'task:complete': (data) => {
        ws.send(JSON.stringify({ type: 'task:complete', ...data }));
      },
      'task:error': (data) => {
        ws.send(JSON.stringify({ type: 'task:error', ...data }));
      },
      'task:cancel': (data) => {
        ws.send(JSON.stringify({ type: 'task:cancel', ...data }));
      },
    };

    // Subscribe to agent events for this session
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      const wrappedHandler = (data) => {
        if (data.sessionId === sessionId) {
          handler(data);
        }
      };
      agentManager.on(event, wrappedHandler);
      ws._handlers = ws._handlers || [];
      ws._handlers.push({ event, handler: wrappedHandler });
    });

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, task, taskId, options } = data;

        switch (type) {
          case 'execute':
            // Execute task
            try {
              const result = await agentManager.executeTask(sessionId, task, options);
              ws.send(JSON.stringify({
                type: 'execute:result',
                result,
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'execute:error',
                error: error.message,
              }));
            }
            break;

          case 'cancel':
            // Cancel task
            const cancelled = agentManager.cancelTask(sessionId, taskId);
            ws.send(JSON.stringify({
              type: 'cancel:result',
              success: cancelled,
            }));
            break;

          case 'status':
            // Get task status
            const status = agentManager.getTaskStatus(sessionId, taskId);
            ws.send(JSON.stringify({
              type: 'status:result',
              status,
            }));
            break;

          case 'tools':
            // Get available tools
            const tools = agentManager.getTools();
            ws.send(JSON.stringify({
              type: 'tools:result',
              tools,
            }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown command: ${type}`,
            }));
        }
      } catch (error) {
        logger.error({ sessionId, error: error.message }, 'WebSocket message error');
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.info({ sessionId }, 'Agent WebSocket disconnected');
      
      // Unsubscribe from events
      if (ws._handlers) {
        ws._handlers.forEach(({ event, handler }) => {
          agentManager.off(event, handler);
        });
      }
    });

    ws.on('error', (error) => {
      logger.error({ sessionId, error: error.message }, 'WebSocket error');
    });
  });

  logger.info('Agent WebSocket server created');
  return wss;
}

module.exports = { createAgentWebSocket };







