import { retryAction, isRetryableError } from './agenticRetry';
import {
  actionUndoManager,
  createOpenUndo,
  // createNavigateUndo, // Reserved for future use
  createCloseTabUndo,
  // createSwitchModeUndo, // Reserved for future use
} from './actionUndo';

/**
 * Extract bracketed actions from agent output, e.g. [SCRAPE https://...]
 */
export function parseAgentActions(output: string): string[] {
  if (!output) return [];
  const matches = output.match(/\[[^\]]+\]/g);
  return matches ?? [];
}

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  success: boolean;
  action: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Progress callback type for long-running actions
 */
export type ActionProgressCallback = (action: string, progress: {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  cancellable?: boolean;
}) => void;

/**
 * Best-effort executor that maps agent actions to IPC calls and real UI flows.
 * This stays intentionally minimal to avoid breaking environments where IPC
 * methods are unavailable (web build).
 */
export async function executeAgentActions(
  actions: string[],
  onProgress?: ActionProgressCallback,
  isCancelled?: (action: string) => boolean
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];
  if (!actions || actions.length === 0) return results;

  for (const action of actions) {
    // Check if action was cancelled before starting
    if (isCancelled?.(action)) {
      const result: ActionExecutionResult = {
        success: false,
        action,
        error: 'Action was cancelled',
        retryable: true,
      };
      results.push(result);
      onProgress?.(action, { status: 'cancelled', message: 'Cancelled' });
      continue;
    }

    const result: ActionExecutionResult = {
      success: false,
      action,
      retryable: false,
    };

    const reportProgress = (progress: Parameters<ActionProgressCallback>[1]) => {
      // Don't report progress if cancelled
      if (isCancelled?.(action)) {
        return;
      }
      onProgress?.(action, progress);
    };

    try {
      reportProgress({ status: 'pending', message: 'Starting...', cancellable: true });
      const upper = action.toUpperCase();
      if (upper.startsWith('[SCRAPE ')) {
        const url = extractPayload(action);
        if (!url) {
          result.error = 'No URL provided';
          results.push(result);
          continue;
        }

        // Validate URL
        const { validateActionUrl, logAction } = await import('./agenticActionValidator');
        const validation = validateActionUrl(url);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid URL';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        const safeUrl = validation.sanitized || url;

        reportProgress({ status: 'running', progress: 20, message: 'Scraping page...', cancellable: true });

        // Check for cancellation before expensive operations
        if (isCancelled?.(action)) {
          result.error = 'Action was cancelled';
          result.retryable = true;
          reportProgress({ status: 'cancelled', message: 'Cancelled' });
          results.push(result);
          continue;
        }

        // Trigger actual scraping via research scraper with automatic retry
        const { scrapeResearchSources } = await import('./researchScraper');
        let scrapeResults;
        try {
          scrapeResults = await retryAction(
            () => scrapeResearchSources([safeUrl]),
            'scrape',
            (attempt, maxRetries) => {
              reportProgress({
                status: 'running',
                progress: 20 + (attempt * 10),
                message: `Retrying scrape (attempt ${attempt + 1}/${maxRetries + 1})...`,
                cancellable: true,
              });
            }
          );
        } catch (retryError) {
          const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
          result.error = errorMsg;
          result.retryable = isRetryableError(errorMsg);
          reportProgress({ status: 'failed', message: errorMsg });
          const { logAction } = await import('./agenticActionValidator');
          logAction(action, false, errorMsg);
          results.push(result);
          continue;
        }
        
        if (isCancelled?.(action)) {
          result.error = 'Action was cancelled';
          result.retryable = true;
          reportProgress({ status: 'cancelled', message: 'Cancelled' });
          results.push(result);
          continue;
        }
        
        reportProgress({ status: 'running', progress: 60, message: 'Opening tab...', cancellable: true });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agent:research-scraped', {
              detail: { url: safeUrl, results: scrapeResults[0] || null },
            })
          );
        }
        // Also open the URL in a tab
        const { ipc } = await import('../lib/ipc-typed');
        await ipc.tabs.create({ url: safeUrl, activate: true }).catch(async () => {
          const tabs = await ipc.tabs.list().catch(() => []);
          const active = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;
          if (active?.id) {
            await ipc.tabs.navigate(active.id, safeUrl);
          }
        });
        
        // Register undo action
        try {
          const undoFn = await createOpenUndo(safeUrl);
          actionUndoManager.registerAction({
            id: `scrape-${Date.now()}`,
            action,
            actionType: 'SCRAPE',
            timestamp: Date.now(),
            undoFn,
            description: `Close tab: ${safeUrl}`,
          });
        } catch (undoError) {
          console.warn('[Agent] Failed to register undo:', undoError);
        }
        
        result.success = true;
        reportProgress({ status: 'completed', progress: 100, message: 'Completed' });
        logAction(action, true);
      } else if (upper.startsWith('[OPEN ')) {
        const url = extractPayload(action);
        if (!url) {
          result.error = 'No URL provided';
          results.push(result);
          continue;
        }

        // Validate URL
        const { validateActionUrl, logAction } = await import('./agenticActionValidator');
        const validation = validateActionUrl(url);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid URL';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        const safeUrl = validation.sanitized || url;

        const { ipc } = await import('../lib/ipc-typed');
        await ipc.tabs.create({ url: safeUrl, activate: true }).catch(async () => {
          // Fallback to navigate if create fails
          const tabs = await ipc.tabs.list().catch(() => []);
          const active = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;
          if (active?.id) {
            await ipc.tabs.navigate(active.id, safeUrl);
          }
        });
        
        // Register undo action
        try {
          const undoFn = await createOpenUndo(safeUrl);
          actionUndoManager.registerAction({
            id: `open-${Date.now()}`,
            action,
            actionType: 'OPEN',
            timestamp: Date.now(),
            undoFn,
            description: `Close tab: ${safeUrl}`,
          });
        } catch (undoError) {
          console.warn('[Agent] Failed to register undo:', undoError);
        }
        
        // Notify research/browse surfaces to reflect intent
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('agent:research-open', { detail: { url: safeUrl } }));
        }
        result.success = true;
        reportProgress({ status: 'completed', progress: 100 });
        logAction(action, true);
      } else if (upper.startsWith('[TRADE ')) {
        // Parse trade actions: [TRADE BUY NIFTY 10] or [TRADE SELL RELIANCE 5]
        const payload = extractPayload(action);
        if (!payload) {
          result.error = 'No trade parameters provided';
          results.push(result);
          continue;
        }

        const { validateTradeAction, logAction } = await import('./agenticActionValidator');
        const parts = payload.toUpperCase().split(/\s+/);
        const actionType = parts[0]; // BUY or SELL
        const symbol = parts.slice(1, -1).join(' '); // Everything except last (quantity)
        const quantity = parseInt(parts[parts.length - 1] || '0', 10);

        const validation = validateTradeAction(actionType, symbol, quantity);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid trade action';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agent:trade-action', {
              detail: {
                intent: payload,
                action: actionType,
                symbol: symbol || payload,
                quantity: quantity || 1,
              },
            })
          );
        }
        result.success = true;
        reportProgress({ status: 'completed', progress: 100 });
        logAction(action, true);
      } else if (upper.startsWith('[SUMMARIZE')) {
        // Trigger summarization of current page or provided URL
        const url = extractPayload(action);
        if (url) {
          // Validate URL if provided
          const { validateActionUrl, logAction } = await import('./agenticActionValidator');
          const validation = validateActionUrl(url);
          if (!validation.valid) {
            result.error = validation.error || 'Invalid URL';
            results.push(result);
            logAction(action, false, result.error);
            continue;
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agent:research-summarize', {
              detail: { url: url || null },
            })
          );
        }
        result.success = true;
        reportProgress({ status: 'completed', progress: 100, message: 'Summarized' });
        const { logAction } = await import('./agenticActionValidator');
        logAction(action, true);
      } else if (upper.startsWith('[SEARCH ')) {
        // Perform a web search
        const query = extractPayload(action);
        if (!query) {
          result.error = 'No search query provided';
          results.push(result);
          continue;
        }

        const { validateSearchQuery, logAction } = await import('./agenticActionValidator');
        const validation = validateSearchQuery(query);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid search query';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        reportProgress({ status: 'running', progress: 50, message: 'Searching...' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agent:search', {
              detail: { query: validation.sanitized || query },
            })
          );
        }
        result.success = true;
        reportProgress({ status: 'completed', progress: 100 });
        logAction(action, true);
      } else if (upper.startsWith('[SWITCH_MODE ')) {
        // Switch application mode
        const mode = extractPayload(action);
        if (!mode) {
          result.error = 'No mode specified';
          results.push(result);
          continue;
        }

        const { validateMode, logAction } = await import('./agenticActionValidator');
        const validation = validateMode(mode);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid mode';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agent:switch-mode', {
              detail: { mode: validation.sanitized || mode.toLowerCase() },
            })
          );
        }
        result.success = true;
        logAction(action, true);
      } else if (upper.startsWith('[CLOSE_TAB')) {
        // Close current tab
        const { ipc } = await import('../lib/ipc-typed');
        const tabs = await ipc.tabs.list().catch(() => []);
        const active = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;
        if (active?.id) {
          const tabUrl = active.url || '';
          const tabTitle = active.title || '';
          
          await ipc.tabs.close({ id: active.id });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agent:tab-closed', { detail: { tabId: active.id } }));
          }
          
          // Register undo action
          try {
            const undoFn = await createCloseTabUndo(active.id, tabUrl, tabTitle);
            actionUndoManager.registerAction({
              id: `close-tab-${Date.now()}`,
              action,
              actionType: 'CLOSE_TAB',
              timestamp: Date.now(),
              undoFn,
              description: `Reopen tab: ${tabTitle || tabUrl}`,
            });
          } catch (undoError) {
            console.warn('[Agent] Failed to register undo:', undoError);
          }
          
          result.success = true;
        } else {
          result.error = 'No active tab to close';
        }
        const { logAction } = await import('./agenticActionValidator');
        logAction(action, result.success, result.error);
      } else if (upper.startsWith('[NAVIGATE ')) {
        // Navigate current tab to URL
        const url = extractPayload(action);
        if (!url) {
          result.error = 'No URL provided';
          results.push(result);
          continue;
        }

        // Validate URL
        const { validateActionUrl, logAction } = await import('./agenticActionValidator');
        const validation = validateActionUrl(url);
        if (!validation.valid) {
          result.error = validation.error || 'Invalid URL';
          results.push(result);
          logAction(action, false, result.error);
          continue;
        }

        const safeUrl = validation.sanitized || url;
        const { ipc } = await import('../lib/ipc-typed');
        const tabs = await ipc.tabs.list().catch(() => []);
        const active = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;
        if (active?.id) {
          await ipc.tabs.navigate(active.id, safeUrl);
        } else {
          // No active tab, create one
          await ipc.tabs.create({ url: safeUrl, activate: true });
        }
        result.success = true;
        logAction(action, true);
      } else {
        // Unknown action type
        result.error = `Unknown action type: ${action}`;
        const { logAction } = await import('./agenticActionValidator');
        logAction(action, false, result.error);
      }

      results.push(result);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      // Determine if action is retryable based on error type
      const errorMsg = result.error.toLowerCase();
      result.retryable = !(
        errorMsg.includes('invalid') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('forbidden')
      );
      reportProgress({ status: 'failed', message: result.error });
      const { logAction } = await import('./agenticActionValidator');
      logAction(action, false, result.error);
      results.push(result);
    }
  }

  return results;
}

function extractPayload(action: string): string | null {
  const match = action.match(/\[.*?\s+(.*)\]/);
  if (!match || !match[1]) return null;
  return match[1].trim();
}

