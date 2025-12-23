/**
 * WebSocket Server for Orchestrator
 * Provides real-time status updates during plan execution
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface StatusUpdate {
  type: 'plan_created' | 'task_started' | 'task_completed' | 'task_failed' | 'plan_completed' | 'plan_failed';
  planId: string;
  taskId?: string;
  status?: string;
  progress?: number;
  message?: string;
  timestamp: Date;
  data?: any;
}

export class OrchestratorWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/orchestrator',
    });

    this.wss.on('connection', (ws: WebSocket, _req: any) => {
      console.log('[OrchestratorWS] New connection');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error: any) {
          console.error('[OrchestratorWS] Invalid message:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('[OrchestratorWS] Connection closed');
      });

      ws.on('error', (error: any) => {
        console.error('[OrchestratorWS] Error:', error);
      });
    });

    console.log('[OrchestratorWS] WebSocket server initialized');
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(ws: WebSocket, data: any): void {
    if (data.type === 'subscribe' && data.planId) {
      this.subscribeClient(ws, data.planId);
      ws.send(JSON.stringify({
        type: 'subscribed',
        planId: data.planId,
        timestamp: new Date(),
      }));
    } else if (data.type === 'unsubscribe' && data.planId) {
      this.unsubscribeClient(ws, data.planId);
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        planId: data.planId,
        timestamp: new Date(),
      }));
    } else if (data.type === 'ping') {
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date(),
      }));
    }
  }

  /**
   * Subscribe client to plan updates
   */
  private subscribeClient(ws: WebSocket, planId: string): void {
    if (!this.clients.has(planId)) {
      this.clients.set(planId, new Set());
    }
    this.clients.get(planId)!.add(ws);
    console.log(`[OrchestratorWS] Client subscribed to plan ${planId}`);
  }

  /**
   * Unsubscribe client from plan updates
   */
  private unsubscribeClient(ws: WebSocket, planId: string): void {
    const clients = this.clients.get(planId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(planId);
      }
    }
  }

  /**
   * Remove client from all subscriptions
   */
  private removeClient(ws: WebSocket): void {
    this.clients.forEach((clients, planId) => {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(planId);
      }
    });
  }

  /**
   * Send status update to subscribed clients
   */
  sendUpdate(update: StatusUpdate): void {
    const clients = this.clients.get(update.planId);
    if (!clients || clients.size === 0) {
      return;
    }

    const message = JSON.stringify(update);
    let sentCount = 0;

    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[OrchestratorWS] Sent ${update.type} to ${sentCount} clients for plan ${update.planId}`);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any): void {
    const payload = JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach((ws: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sentCount++;
      }
    });

    console.log(`[OrchestratorWS] Broadcast to ${sentCount} clients`);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeSubscriptions: number;
    planSubscriptions: Record<string, number>;
  } {
    const planSubscriptions: Record<string, number> = {};
    
    this.clients.forEach((clients, planId) => {
      planSubscriptions[planId] = clients.size;
    });

    return {
      totalConnections: this.wss.clients.size,
      activeSubscriptions: this.clients.size,
      planSubscriptions,
    };
  }

  /**
   * Close all connections
   */
  close(): void {
    this.wss.clients.forEach((ws: any) => {
      ws.close();
    });
    this.wss.close();
    console.log('[OrchestratorWS] WebSocket server closed');
  }
}

// Singleton instance
let wsInstance: OrchestratorWebSocket | null = null;

export function initOrchestratorWebSocket(server: Server): OrchestratorWebSocket {
  if (!wsInstance) {
    wsInstance = new OrchestratorWebSocket(server);
  }
  return wsInstance;
}

export function getOrchestratorWebSocket(): OrchestratorWebSocket | null {
  return wsInstance;
}

// Helper functions
export function sendPlanCreated(planId: string, data?: any): void {
  wsInstance?.sendUpdate({
    type: 'plan_created',
    planId,
    timestamp: new Date(),
    data,
  });
}

export function sendTaskStarted(planId: string, taskId: string, message?: string): void {
  wsInstance?.sendUpdate({
    type: 'task_started',
    planId,
    taskId,
    message,
    timestamp: new Date(),
  });
}

export function sendTaskCompleted(planId: string, taskId: string, data?: any): void {
  wsInstance?.sendUpdate({
    type: 'task_completed',
    planId,
    taskId,
    status: 'completed',
    timestamp: new Date(),
    data,
  });
}

export function sendTaskFailed(planId: string, taskId: string, message: string): void {
  wsInstance?.sendUpdate({
    type: 'task_failed',
    planId,
    taskId,
    status: 'failed',
    message,
    timestamp: new Date(),
  });
}

export function sendPlanCompleted(planId: string, data?: any): void {
  wsInstance?.sendUpdate({
    type: 'plan_completed',
    planId,
    status: 'completed',
    progress: 100,
    timestamp: new Date(),
    data,
  });
}

export function sendPlanFailed(planId: string, message: string): void {
  wsInstance?.sendUpdate({
    type: 'plan_failed',
    planId,
    status: 'failed',
    message,
    timestamp: new Date(),
  });
}

export default OrchestratorWebSocket;
