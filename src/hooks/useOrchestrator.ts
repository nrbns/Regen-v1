/**
 * Orchestrator React Hook
 * Provides easy access to orchestrator API from React components
 * Includes WebSocket support for real-time updates
 */

import { useState, useCallback, useEffect } from 'react';
import { useOrchestratorWebSocket, type StatusUpdate } from './useOrchestratorWebSocket';

const API_BASE = '/api/orchestrator';

// API types (matched with backend types)
export interface IntentClassification {
  intent: string;
  confidence: number;
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAgents: string[];
  metadata?: any;
}

export interface ExecutionPlan {
  planId: string;
  userId: string;
  input: string;
  intent: IntentClassification;
  tasks: Array<{
    taskId: string;
    name: string;
    description: string;
    agent: string;
    dependencies: string[];
    estimatedDuration?: number;
    parameters?: any;
  }>;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  metadata?: any;
}

export interface ExecutionResult {
  success: boolean;
  planId: string;
  completedTasks: number;
  failedTasks: number;
  results: Array<{
    taskId: string;
    status: 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    duration?: number;
  }>;
  duration: number;
  metadata?: any;
}

interface UseOrchestratorReturn {
  // State
  loading: boolean;
  error: string | null;
  classification: IntentClassification | null;
  plan: ExecutionPlan | null;
  result: ExecutionResult | null;

  // WebSocket state
  wsConnected: boolean;
  wsError: string | null;
  lastUpdate: StatusUpdate | null;
  updates: StatusUpdate[];

  // Actions
  classify: (input: string) => Promise<IntentClassification>;
  createPlan: (input: string, userId: string, context?: any) => Promise<ExecutionPlan>;
  approvePlan: (planId: string, userId: string) => Promise<void>;
  rejectPlan: (planId: string, userId: string, reason: string) => Promise<void>;
  getPlanStatus: (planId: string) => Promise<any>;
  executeDirect: (input: string, userId: string) => Promise<ExecutionResult>;
  reset: () => void;
  clearUpdates: () => void;
}

export function useOrchestrator(): UseOrchestratorReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classification, setClassification] = useState<IntentClassification | null>(null);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  // WebSocket for real-time updates
  const ws = useOrchestratorWebSocket({
    autoConnect: true,
  });

  // Auto-subscribe when plan is created
  useEffect(() => {
    if (plan?.planId) {
      ws.subscribeToPlan(plan.planId);
    }
  }, [plan?.planId, ws]);

  const classify = useCallback(async (input: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.statusText}`);
      }

      const data = await response.json();
      setClassification(data.classification);
      return data.classification;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (input: string, userId: string, context?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, userId, context }),
      });

      if (!response.ok) {
        throw new Error(`Plan creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setPlan(data.plan);
      return data.plan;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approvePlan = useCallback(async (planId: string, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId }),
      });

      if (!response.ok) {
        throw new Error(`Approval failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Orchestrator] Plan approved:', data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectPlan = useCallback(async (planId: string, userId: string, reason: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId, reason }),
      });

      if (!response.ok) {
        throw new Error(`Rejection failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Orchestrator] Plan rejected:', data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlanStatus = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/status/${planId}`);

      if (!response.ok) {
        throw new Error(`Status fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      }
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeDirect = useCallback(async (input: string, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403 && data.planId) {
          // Plan requires approval
          throw new Error('REQUIRES_APPROVAL');
        }
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
      return data.result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setClassification(null);
    setPlan(null);
    setResult(null);
    ws.clearUpdates();
  }, [ws]);

  const clearUpdates = useCallback(() => {
    ws.clearUpdates();
  }, [ws]);

  return {
    loading,
    error,
    classification,
    plan,
    result,
    wsConnected: ws.connected,
    wsError: ws.error,
    lastUpdate: ws.lastUpdate,
    updates: ws.updates,
    classify,
    createPlan,
    approvePlan,
    rejectPlan,
    getPlanStatus,
    executeDirect,
    reset,
    clearUpdates,
  };
}

export default useOrchestrator;
