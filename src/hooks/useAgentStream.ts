/**
 * useAgentStream Hook
 * React hook for real-time agent task updates via WebSocket
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface AgentStep {
  type: 'tool_call' | 'tool_result' | 'plan' | 'error';
  tool?: string;
  params?: any;
  result?: any;
  error?: string;
  timestamp: number;
}

interface AgentTask {
  id: string;
  task: string;
  status: 'planning' | 'executing' | 'completed' | 'error' | 'cancelled';
  steps: AgentStep[];
  progress: number;
  startTime?: number;
  endTime?: number;
}

interface UseAgentStreamOptions {
  sessionId?: string;
  wsUrl?: string;
  autoReconnect?: boolean;
  onTaskStart?: (task: AgentTask) => void;
  onTaskComplete?: (task: AgentTask) => void;
  onTaskError?: (task: AgentTask, error: string) => void;
  onStep?: (step: AgentStep) => void;
}

interface UseAgentStreamReturn {
  isConnected: boolean;
  currentTask: AgentTask | null;
  executeTask: (task: string, options?: any) => Promise<string | null>;
  cancelTask: (taskId: string) => Promise<boolean>;
  getTaskStatus: (taskId: string) => Promise<AgentTask | null>;
  getTools: () => Promise<any[]>;
}

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/agent';

export function useAgentStream(options: UseAgentStreamOptions = {}): UseAgentStreamReturn {
  const {
    sessionId: initialSessionId,
    wsUrl = DEFAULT_WS_URL,
    autoReconnect = true,
    onTaskStart,
    onTaskComplete,
    onTaskError,
    onStep,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(initialSessionId || `agent-${Date.now()}`);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const taskMapRef = useRef<Map<string, AgentTask>>(new Map());

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const url = `${wsUrl}?sessionId=${sessionIdRef.current}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useAgentStream] WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            console.log('[useAgentStream] Connected to agent stream');
            break;

          case 'task:start':
            const task: AgentTask = {
              id: message.taskId,
              task: message.task,
              status: 'planning',
              steps: [],
              progress: 0,
              startTime: Date.now(),
            };
            taskMapRef.current.set(message.taskId, task);
            setCurrentTask(task);
            onTaskStart?.(task);
            break;

          case 'task:plan':
            const planTask = taskMapRef.current.get(message.taskId);
            if (planTask) {
              planTask.status = 'executing';
              setCurrentTask({ ...planTask });
            }
            break;

          case 'task:step:start':
            const stepStartTask = taskMapRef.current.get(message.taskId);
            if (stepStartTask) {
              const step: AgentStep = {
                type: 'tool_call',
                tool: message.step.tool,
                params: message.step.params,
                timestamp: Date.now(),
              };
              stepStartTask.steps.push(step);
              setCurrentTask({ ...stepStartTask });
              onStep?.(step);
            }
            break;

          case 'task:step:complete':
            const stepCompleteTask = taskMapRef.current.get(message.taskId);
            if (stepCompleteTask) {
              const lastStep = stepCompleteTask.steps[stepCompleteTask.steps.length - 1];
              if (lastStep) {
                lastStep.type = 'tool_result';
                lastStep.result = message.result;
              }
              stepCompleteTask.progress = (stepCompleteTask.steps.length / (message.stepIndex + 1)) * 100;
              setCurrentTask({ ...stepCompleteTask });
              onStep?.(lastStep);
            }
            break;

          case 'task:step:error':
            const stepErrorTask = taskMapRef.current.get(message.taskId);
            if (stepErrorTask) {
              const errorStep: AgentStep = {
                type: 'error',
                tool: message.step.tool,
                error: message.error,
                timestamp: Date.now(),
              };
              stepErrorTask.steps.push(errorStep);
              setCurrentTask({ ...stepErrorTask });
              onStep?.(errorStep);
            }
            break;

          case 'task:complete':
            const completeTask = taskMapRef.current.get(message.taskId);
            if (completeTask) {
              completeTask.status = 'completed';
              completeTask.progress = 100;
              completeTask.endTime = Date.now();
              setCurrentTask({ ...completeTask });
              onTaskComplete?.(completeTask);
            }
            break;

          case 'task:error':
            const errorTask = taskMapRef.current.get(message.taskId);
            if (errorTask) {
              errorTask.status = 'error';
              errorTask.endTime = Date.now();
              setCurrentTask({ ...errorTask });
              onTaskError?.(errorTask, message.error);
            }
            break;

          case 'task:cancel':
            const cancelTask = taskMapRef.current.get(message.taskId);
            if (cancelTask) {
              cancelTask.status = 'cancelled';
              cancelTask.endTime = Date.now();
              setCurrentTask({ ...cancelTask });
            }
            break;
        }
      } catch (error) {
        console.error('[useAgentStream] Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[useAgentStream] WebSocket disconnected');
      setIsConnected(false);
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useAgentStream] Attempting to reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('[useAgentStream] WebSocket error:', error);
    };
  }, [wsUrl, autoReconnect, onTaskStart, onTaskComplete, onTaskError, onStep]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  /**
   * Execute a task
   */
  const executeTask = useCallback(async (task: string, options: any = {}): Promise<string | null> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const _messageId = `execute-${Date.now()}`;
      
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'execute:result') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.result?.taskId || null);
          } else if (message.type === 'execute:error') {
            wsRef.current?.removeEventListener('message', handler);
            reject(new Error(message.error));
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(JSON.stringify({
        type: 'execute',
        task,
        options,
      }));
    });
  }, []);

  /**
   * Cancel a task
   */
  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'cancel:result') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.success);
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(JSON.stringify({
        type: 'cancel',
        taskId,
      }));
    });
  }, []);

  /**
   * Get task status
   */
  const getTaskStatus = useCallback(async (taskId: string): Promise<AgentTask | null> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return taskMapRef.current.get(taskId) || null;
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'status:result') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.status);
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(JSON.stringify({
        type: 'status',
        taskId,
      }));
    });
  }, []);

  /**
   * Get available tools
   */
  const getTools = useCallback(async (): Promise<any[]> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'tools:result') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.tools || []);
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(JSON.stringify({
        type: 'tools',
      }));
    });
  }, []);

  return {
    isConnected,
    currentTask,
    executeTask,
    cancelTask,
    getTaskStatus,
    getTools,
  };
}

