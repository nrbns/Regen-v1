/**
 * Omni Engine Server
 * HTTP/WebSocket API for AI, workflows, and command execution
 * Can be used by Electron, Brave fork, or any client
 */

// ============================================================================
// GLOBAL ERROR GUARDS - MUST BE FIRST
// ============================================================================
process.on('uncaughtException', err => {
  console.error('[FATAL] Uncaught exception in Omni Engine:', err);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
  }
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('[FATAL] Unhandled rejection in Omni Engine:', reason);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
  }
});

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { commandHandler } from './handlers/command';
import { workflowHandler } from './handlers/workflow';
import { createLogger } from './utils/logger';

const log = createLogger('omni-engine');
const PORT = process.env.ENGINE_PORT ? parseInt(process.env.ENGINE_PORT, 10) : 3030;

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'omni-engine', version: '0.1.0' });
});

// Command API - Main entry point for AI commands
app.post('/api/command', async (req, res) => {
  try {
    const result = await commandHandler(req.body);
    res.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Command handler error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// Workflow API
app.get('/api/workflows', async (_req, res) => {
  try {
    const workflows = await workflowHandler.list();
    res.json({ workflows });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('List workflows error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await workflowHandler.get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ workflow });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Get workflow error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workflows/:id/run', async (req, res) => {
  try {
    const result = await workflowHandler.run(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Run workflow error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', ws => {
  log.info('WebSocket client connected');

  ws.on('message', async data => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'command') {
        const result = await commandHandler(message.payload);
        ws.send(JSON.stringify({ type: 'result', data: result }));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('WebSocket message error', { error: err.message });
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    log.info('WebSocket client disconnected');
  });
});

// Error handling
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    log.error(`Port ${PORT} is already in use. Engine will not start, but app will continue.`);
    // Don't exit - allow app to continue without engine
    return;
  }
  log.error('Server error', { error: error.message, code: error.code });
  // Don't exit on error - allow graceful degradation
});

// Start server
server
  .listen(PORT, () => {
    log.info(`Omni Engine server running on port ${PORT}`);
    log.info(`Health check: http://localhost:${PORT}/health`);
    log.info(`WebSocket: ws://localhost:${PORT}/ws`);
  })
  .on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      log.warn(`Port ${PORT} is already in use. Engine will not start, but app will continue.`);
      return;
    }
    log.error('Failed to start server', { error: error.message, code: error.code });
    // Don't exit - allow app to continue
  });

// Note: Global error handlers are already set up at the top of the file
// These handlers are redundant but kept for backward compatibility

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});
