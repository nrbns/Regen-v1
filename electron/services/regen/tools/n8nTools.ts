/**
 * n8n Tools for Regen
 * Integrates with n8n workflows for heavy automation
 */

import { createLogger } from '../../utils/logger';

const log = createLogger('regen-n8n-tools');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const _N8N_API_KEY = process.env.N8N_API_KEY || '';

export interface N8NWorkflowResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionId?: string;
}

/**
 * Call an n8n workflow via webhook
 */
export async function runWorkflow(
  workflowId: string,
  payload: Record<string, unknown>
): Promise<N8NWorkflowResult> {
  try {
    const webhookUrl = `${N8N_BASE_URL}/webhook/${workflowId}`;

    log.info('Calling n8n workflow', { workflowId, webhookUrl });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('n8n workflow failed', {
        workflowId,
        status: response.status,
        error: errorText,
      });
      return {
        success: false,
        error: `Workflow failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));

    return {
      success: true,
      data,
      executionId: data.executionId || data.id,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to call n8n workflow', { workflowId, error: err.message });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Trigger n8n workflow for multi-source research
 */
export async function runResearchWorkflow(
  query: string,
  options?: {
    inputLanguage?: string;
    outputLanguage?: string;
    region?: string;
    maxResults?: number;
  }
): Promise<N8NWorkflowResult> {
  return runWorkflow('multi_source_research', {
    query,
    maxResults: options?.maxResults || 10,
    sources: ['web', 'news', 'academic'],
    inputLanguage: options?.inputLanguage || 'en',
    outputLanguage: options?.outputLanguage || 'en',
    region: options?.region || 'IN',
  });
}

/**
 * Trigger n8n workflow for page watching
 */
export async function runWatchPageWorkflow(
  url: string,
  threshold?: number,
  userId?: string
): Promise<N8NWorkflowResult> {
  return runWorkflow('watch_page_price', {
    url,
    threshold,
    userId,
    callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/regen/event`,
  });
}

/**
 * Check if n8n is available
 */
export async function checkN8NAvailability(): Promise<boolean> {
  try {
    const healthUrl = `${N8N_BASE_URL}/healthz`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
