/**
 * Orchestrator WebSocket (runtime JS)
 * ESM module compatible with Fastify/Express servers
 */

import { WebSocketServer, WebSocket } from 'ws';

class OrchestratorWebSocket {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/orchestrator' });
    this.clients = new Map(); // planId -> Set<WebSocket>

    this.wss.on('connection', ws => {
      ws.on('message', message => {
        try {
          const data = JSON.parse(message.toString());
          this.#handleMessage(ws, data);
        } catch {
          // ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.#removeClient(ws);
      });
    });
  }

  #handleMessage(ws, data) {
    if (data?.type === 'subscribe' && data.planId) {
      if (!this.clients.has(data.planId)) this.clients.set(data.planId, new Set());
      this.clients.get(data.planId).add(ws);
      ws.send(JSON.stringify({ type: 'subscribed', planId: data.planId, timestamp: new Date() }));
      return;
    }
    if (data?.type === 'unsubscribe' && data.planId) {
      const set = this.clients.get(data.planId);
      if (set) set.delete(ws);
      ws.send(JSON.stringify({ type: 'unsubscribed', planId: data.planId, timestamp: new Date() }));
      return;
    }
    if (data?.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
    }
  }

  #removeClient(ws) {
    for (const [planId, set] of this.clients.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) this.clients.delete(planId);
      }
    }
  }

  sendUpdate(update) {
    const clients = this.clients.get(update.planId);
    if (!clients || clients.size === 0) return;
    const payload = JSON.stringify(update);
    for (const ws of clients.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const ws of this.wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

let wsInstance = null;

export function initOrchestratorWebSocket(server) {
  if (!wsInstance) wsInstance = new OrchestratorWebSocket(server);
  return wsInstance;
}

export function getOrchestratorWebSocket() {
  return wsInstance;
}

export function sendPlanCreated(planId, data) {
  wsInstance?.sendUpdate({ type: 'plan_created', planId, timestamp: new Date(), data });
}

export function sendTaskStarted(planId, taskId, message) {
  wsInstance?.sendUpdate({ type: 'task_started', planId, taskId, message, timestamp: new Date() });
}

export function sendTaskCompleted(planId, taskId, data) {
  wsInstance?.sendUpdate({
    type: 'task_completed',
    planId,
    taskId,
    status: 'completed',
    timestamp: new Date(),
    data,
  });
}

export function sendTaskFailed(planId, taskId, message) {
  wsInstance?.sendUpdate({
    type: 'task_failed',
    planId,
    taskId,
    status: 'failed',
    message,
    timestamp: new Date(),
  });
}

export function sendPlanCompleted(planId, data) {
  wsInstance?.sendUpdate({
    type: 'plan_completed',
    planId,
    status: 'completed',
    progress: 100,
    timestamp: new Date(),
    data,
  });
}

export function sendPlanFailed(planId, message) {
  wsInstance?.sendUpdate({
    type: 'plan_failed',
    planId,
    status: 'failed',
    message,
    timestamp: new Date(),
  });
}

export default OrchestratorWebSocket;
