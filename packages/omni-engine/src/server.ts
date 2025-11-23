/**
 * Omni Engine Server
 * HTTP/WebSocket API for AI, workflows, and command execution
 * Can be used by Electron, Brave fork, or any client
 */

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

// Start server
server.listen(PORT, () => {
  log.info(`Omni Engine server running on port ${PORT}`);
  log.info(`Health check: http://localhost:${PORT}/health`);
  log.info(`WebSocket: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});
