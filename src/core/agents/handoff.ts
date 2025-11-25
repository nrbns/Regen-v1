/**
 * Multi-Agent Handoff System
 * Enables agents to pass data and trigger actions in other modes
 */

import { ipc } from '../../lib/ipc-typed';
import { useSettingsStore } from '../../state/settingsStore';
import { toast } from 'react-hot-toast';

export type HandoffTarget = 'research' | 'trade' | 'browse' | 'agent' | 'n8n';

export interface HandoffPayload {
  type: string;
  data: Record<string, unknown>;
  sourceMode: string;
  targetMode: HandoffTarget;
  language?: string;
  metadata?: {
    priority?: 'low' | 'medium' | 'high';
    autoExecute?: boolean;
    [key: string]: unknown;
  };
}

export interface HandoffResult {
  success: boolean;
  targetId?: string;
  error?: string;
  data?: unknown;
}

/**
 * Send handoff from one agent/mode to another
 */
export async function sendHandoff(payload: HandoffPayload): Promise<HandoffResult> {
  try {
    const language = payload.language || useSettingsStore.getState().language || 'auto';

    switch (payload.targetMode) {
      case 'research':
        return await handoffToResearch(payload, language);

      case 'trade':
        return await handoffToTrade(payload, language);

      case 'n8n':
        return await handoffToN8n(payload, language);

      case 'browse':
        return await handoffToBrowse(payload, language);

      default:
        return { success: false, error: `Unknown target mode: ${payload.targetMode}` };
    }
  } catch (error: any) {
    console.error('[Handoff] Failed to send handoff:', error);
    return {
      success: false,
      error: error.message || 'Unknown handoff error',
    };
  }
}

/**
 * Handoff to Research mode
 */
async function handoffToResearch(
  payload: HandoffPayload,
  language: string
): Promise<HandoffResult> {
  try {
    const query = (payload.data.query as string) || (payload.data.summary as string);
    if (!query) {
      return { success: false, error: 'No query or summary provided for research' };
    }

    // Trigger research query
    const researchResult = await ipc.research.queryEnhanced({
      query,
      maxSources: 12,
      language: language !== 'auto' ? language : undefined,
    });

    toast.success(`Research complete: ${query.slice(0, 50)}...`, {
      duration: 3000,
    });

    return {
      success: true,
      data: researchResult,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Research handoff failed',
    };
  }
}

/**
 * Handoff to Trade mode
 */
async function handoffToTrade(payload: HandoffPayload, _language: string): Promise<HandoffResult> {
  try {
    const symbol = payload.data.symbol as string;
    const action = payload.data.action as 'alert' | 'analyze' | 'signal';
    const message = (payload.data.message as string) || (payload.data.summary as string);

    if (!symbol && !message) {
      return { success: false, error: 'No symbol or message provided for trade' };
    }

    // Create trade alert or signal
    if (action === 'alert' || action === 'signal') {
      const alertMessage = message || `Alert for ${symbol}`;

      // Show toast notification
      toast.success(alertMessage, {
        duration: 5000,
        icon: '📈',
      });

      // Optionally trigger IPC event for trade mode
      try {
        const activeTab = await ipc.tabs.list().then(tabs => tabs.find(t => t.active) || tabs[0]);
        if (activeTab) {
          await ipc.crossReality?.handoff?.(activeTab.id, 'mobile');
        }
      } catch {
        // IPC might not be available, that's okay
        console.debug('[Handoff] Trade IPC not available, using toast only');
      }
    }

    return {
      success: true,
      data: { symbol, action, message },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Trade handoff failed',
    };
  }
}

/**
 * Handoff to n8n workflow
 */
export async function handoffToN8n(
  payload: HandoffPayload,
  language: string
): Promise<HandoffResult> {
  try {
    const workflowId = payload.data.workflowId as string;
    const workflowUrl = (payload.data.workflowUrl as string) || 'http://localhost:5678';

    if (!workflowId && !workflowUrl) {
      return { success: false, error: 'No workflow ID or URL provided' };
    }

    // Call n8n webhook
    const n8nUrl = workflowUrl.includes('http')
      ? `${workflowUrl}/webhook/${workflowId}`
      : `http://localhost:5678/webhook/${workflowId}`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload.data,
        language,
        sourceMode: payload.sourceMode,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n workflow returned ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));

    toast.success(`Workflow triggered: ${workflowId}`, {
      duration: 3000,
    });

    return {
      success: true,
      targetId: workflowId,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'n8n handoff failed',
    };
  }
}

/**
 * Handoff to Browse mode (open URL in tab)
 */
async function handoffToBrowse(payload: HandoffPayload, _language: string): Promise<HandoffResult> {
  try {
    const url = payload.data.url as string;
    if (!url) {
      return { success: false, error: 'No URL provided for browse' };
    }

    // Create or navigate to tab
    const tab = await ipc.tabs.create({
      url,
      activate: true,
    });

    const tabId = typeof tab === 'object' && tab && 'id' in tab ? String(tab.id) : String(tab);

    return {
      success: true,
      targetId: tabId,
      data: tab,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Browse handoff failed',
    };
  }
}

/**
 * Helper: Research → Trade handoff
 * Example: "Research Nifty news" → "Alert me when Nifty changes"
 */
export async function researchToTrade(
  researchSummary: string,
  symbol?: string,
  language?: string
): Promise<HandoffResult> {
  return sendHandoff({
    type: 'research-to-trade',
    data: {
      summary: researchSummary,
      symbol: symbol || 'NIFTY',
      action: 'alert',
      message: `Research update: ${researchSummary.slice(0, 100)}...`,
    },
    sourceMode: 'research',
    targetMode: 'trade',
    language: language || useSettingsStore.getState().language || 'auto',
    metadata: {
      priority: 'medium',
      autoExecute: true,
    },
  });
}

/**
 * Helper: Trade → Research handoff
 * Example: "Analyze AAPL" → "Research AAPL fundamentals"
 */
export async function tradeToResearch(
  symbol: string,
  query: string,
  language?: string
): Promise<HandoffResult> {
  return sendHandoff({
    type: 'trade-to-research',
    data: {
      symbol,
      query: `${symbol} ${query}`,
    },
    sourceMode: 'trade',
    targetMode: 'research',
    language: language || useSettingsStore.getState().language || 'auto',
    metadata: {
      priority: 'high',
      autoExecute: true,
    },
  });
}
