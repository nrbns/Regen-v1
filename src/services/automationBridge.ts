/**
 * Automation Bridge - Connects PlaybookForge to AgentConsole
 * Handles automation execution, status, and feedback
 */

import { useAgentStreamStore } from '../state/agentStreamStore';
import { toast } from '../utils/toast';

export interface AutomationPlaybook {
  id: string;
  title: string;
  goal: string;
  steps: Array<{
    skill: string;
    args: Record<string, any>;
  }>;
  output?: {
    type: string;
    schema?: Record<string, any>;
  };
}

export type AutomationStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface AutomationExecution {
  id: string;
  playbookId: string;
  status: AutomationStatus;
  startTime: number;
  endTime?: number;
  error?: string;
  result?: any;
  progress?: number;
}

// Global automation state
let currentExecution: AutomationExecution | null = null;
const executionListeners: Set<(execution: AutomationExecution | null) => void> = new Set();

/**
 * Execute an automation playbook
 */
export async function executeAutomation(playbook: AutomationPlaybook): Promise<string> {
  const executionId = `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  currentExecution = {
    id: executionId,
    playbookId: playbook.id || executionId,
    status: 'running',
    startTime: Date.now(),
    progress: 0,
  };

  notifyListeners();

  try {
    // Navigate to AgentConsole if not already there
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-to-agent-console'));
    }

    // Use AgentConsole's execution system
    const agentStore = useAgentStreamStore.getState();
    agentStore.setRun(executionId, playbook.goal);
    agentStore.setStatus('connecting'); // Will transition to 'live' when execution starts

    // Parse and execute the playbook
    const dsl = {
      goal: playbook.goal,
      steps: playbook.steps,
      output: playbook.output,
    };

    // Trigger agent execution via window event (AgentConsole listens for this)
    window.dispatchEvent(
      new CustomEvent('agent:execute', {
        detail: {
          runId: executionId,
          dsl,
          playbookTitle: playbook.title,
        },
      })
    );

    toast.success(`Starting automation: ${playbook.title}`);
    return executionId;
  } catch (error) {
    currentExecution = {
      ...currentExecution!,
      status: 'error',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    notifyListeners();
    toast.error(`Automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get current automation execution status
 */
export function getAutomationStatus(): AutomationExecution | null {
  return currentExecution;
}

/**
 * Subscribe to automation status updates
 */
export function onAutomationStatusUpdate(
  callback: (execution: AutomationExecution | null) => void
): () => void {
  executionListeners.add(callback);
  return () => {
    executionListeners.delete(callback);
  };
}

/**
 * Update automation execution status
 */
export function updateAutomationStatus(
  executionId: string,
  updates: Partial<AutomationExecution>
): void {
  if (currentExecution && currentExecution.id === executionId) {
    currentExecution = { ...currentExecution, ...updates };
    notifyListeners();
  }
}

/**
 * Cancel current automation
 */
export function cancelAutomation(): void {
  if (currentExecution && currentExecution.status === 'running') {
    currentExecution = {
      ...currentExecution,
      status: 'cancelled',
      endTime: Date.now(),
    };
    notifyListeners();

    // Cancel agent execution
    window.dispatchEvent(new CustomEvent('agent:cancel'));
    toast.info('Automation cancelled');
  }
}

/**
 * Complete automation execution
 */
export function completeAutomation(executionId: string, result?: any, error?: string): void {
  if (currentExecution && currentExecution.id === executionId) {
    currentExecution = {
      ...currentExecution,
      status: error ? 'error' : 'success',
      endTime: Date.now(),
      result,
      error,
      progress: 100,
    };
    notifyListeners();

    if (error) {
      toast.error(`Automation failed: ${error}`);
    } else {
      toast.success('Automation completed successfully');
    }
  }
}

function notifyListeners(): void {
  executionListeners.forEach(callback => {
    try {
      callback(currentExecution);
    } catch (error) {
      console.error('[AutomationBridge] Error in listener:', error);
    }
  });
}

