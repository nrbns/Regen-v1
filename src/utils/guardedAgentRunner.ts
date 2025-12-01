/**
 * Guarded Agent Runner - PR: Fix tab switch race conditions
 * Prevents agent operations from affecting wrong tabs when user switches quickly
 */

import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAgentStreamStore } from '../state/agentStreamStore';

// Track active runs per tab to prevent duplicate/overlapping runs
const activeRuns = new Map<string, { startTime: number; abortController?: AbortController }>();

/**
 * Guarded run agent - ensures tab still exists and is active before applying results
 */
export async function guardedRunAgent(
  tabId: string,
  options: {
    extractText?: boolean;
    sendToBackend?: boolean;
    onProgress?: (stage: string, data?: any) => void;
  } = {}
): Promise<void> {
  // Check if already running for this tab
  if (activeRuns.has(tabId)) {
    const existing = activeRuns.get(tabId);
    if (existing && Date.now() - existing.startTime < 5000) {
      console.log('[GUARDED_AGENT] Run already in progress for tab', tabId);
      return;
    }
  }

  // Capture tab state at call time
  const tabsState = useTabsStore.getState();
  const tab = tabsState.tabs.find(t => t.id === tabId);

  if (!tab) {
    console.warn('[GUARDED_AGENT] Tab not found', tabId);
    return;
  }

  const capturedTabId = tabId;
  const capturedUrl = tab.url || '';

  console.log('[GUARDED_AGENT] Starting run for tab', {
    tabId: capturedTabId,
    url: capturedUrl,
    activeTabId: tabsState.activeId,
  });

  // Mark as running
  const abortController = new AbortController();
  activeRuns.set(capturedTabId, {
    startTime: Date.now(),
    abortController,
  });

  // Update agent stream store with active tab
  useAgentStreamStore.getState().setActiveTabId(capturedTabId);

  try {
    // Update tab state to loading
    useTabsStore.getState().updateTab(capturedTabId, {
      // Add a loading flag if needed
    });

    options.onProgress?.('extracting', { tabId: capturedTabId });

    // Extract page text if needed
    let pageText: string | null = null;
    if (options.extractText !== false && capturedUrl && !capturedUrl.startsWith('about:')) {
      try {
        // Check tab still exists before extraction
        const currentTabsState = useTabsStore.getState();
        const tabStillExists = currentTabsState.tabs.find((t: any) => t.id === capturedTabId);
        if (!tabStillExists) {
          console.log('[GUARDED_AGENT] Tab removed during extraction, aborting');
          return;
        }

        // Call Tauri extract_page_text if available
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            pageText = await invoke<string>('extract_page_text', { url: capturedUrl });
            console.log('[GUARDED_AGENT] Extracted text length', pageText?.length || 0);
          } catch (error) {
            console.warn('[GUARDED_AGENT] Extract failed, continuing without text', error);
          }
        }
      } catch (error) {
        console.error('[GUARDED_AGENT] Text extraction error', error);
      }
    }

    // Check tab still exists and is still active before sending to backend
    const currentTabsState = useTabsStore.getState();
    const tabStillExists = currentTabsState.tabs.find((t: any) => t.id === capturedTabId);
    const isStillActive = currentTabsState.activeId === capturedTabId;

    if (!tabStillExists) {
      console.log('[GUARDED_AGENT] Tab removed before backend send, aborting');
      return;
    }

    if (!isStillActive) {
      console.log('[GUARDED_AGENT] Tab no longer active, aborting backend send', {
        capturedTabId,
        currentActiveId: currentTabsState.activeId,
      });
      return;
    }

    // Send to backend if needed
    if (options.sendToBackend !== false && pageText) {
      options.onProgress?.('sending', { tabId: capturedTabId });

      // PR: Fix tab switch - send via WebSocket with explicit tabId
      const agentContext = {
        type: 'start_agent',
        tabId: capturedTabId,
        tab_id: capturedTabId, // Support both camelCase and snake_case
        sessionId: tab.sessionId || null,
        session_id: tab.sessionId || null,
        query: `Summarize and analyze: ${tab.title || capturedUrl}`,
        url: capturedUrl,
        context: pageText.slice(0, 4000),
        mode: tab.appMode?.toLowerCase() || 'browse',
      };

      // Try WebSocket first, fallback to IPC
      try {
        // Check if WebSocket is available
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:18080/agent_ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[GUARDED_AGENT] WebSocket connected, sending context', {
            tabId: capturedTabId,
            url: capturedUrl,
          });
          ws.send(JSON.stringify(agentContext));
        };

        ws.onmessage = async event => {
          try {
            const data = JSON.parse(event.data);
            console.log('[GUARDED_AGENT] WebSocket event', {
              type: data.type,
              tabId: data.tabId || data.tab_id,
              eventTabId: data.tabId,
              activeTabId: useTabsStore.getState().activeId,
            });

            // Only process events for the current active tab
            const eventTabId = data.tabId || data.tab_id;
            const currentActiveId = useTabsStore.getState().activeId;

            if (eventTabId && eventTabId !== currentActiveId) {
              console.log('[GUARDED_AGENT] Ignoring event for inactive tab', {
                eventTabId,
                currentActiveId,
              });
              return;
            }

            // Forward to agent stream store with tabId
            const { useAgentStreamStore } = await import('../state/agentStreamStore').catch(() => {
              // Fallback if import fails
              return { useAgentStreamStore: null };
            });
            if (!useAgentStreamStore) return;
            const streamStore = useAgentStreamStore.getState();

            if (data.type === 'partial_summary' || data.type === 'agent_start') {
              streamStore.appendEvent({
                id: `evt_${Date.now()}_${Math.random()}`,
                type: data.type === 'agent_start' ? 'start' : 'step',
                content: data.payload?.text || data.payload?.message || '',
                timestamp: Date.now(),
                tabId: eventTabId || capturedTabId,
                sessionId: data.sessionId || data.session_id || tab.sessionId || null,
              });

              if (data.payload?.text) {
                streamStore.appendTranscript(data.payload.text);
              }
            } else if (data.type === 'final_summary') {
              streamStore.appendEvent({
                id: `evt_${Date.now()}_${Math.random()}`,
                type: 'done',
                content: JSON.stringify(data.payload?.summary || {}),
                timestamp: Date.now(),
                tabId: eventTabId || capturedTabId,
                sessionId: data.sessionId || data.session_id || tab.sessionId || null,
              });
            } else if (data.type === 'agent_end') {
              streamStore.setStatus('complete');
            } else if (data.type === 'error') {
              streamStore.setError(data.payload?.message || 'Unknown error');
            }
          } catch (error) {
            console.warn('[GUARDED_AGENT] Failed to parse WebSocket message', error);
          }
        };

        ws.onerror = error => {
          console.warn('[GUARDED_AGENT] WebSocket error', error);
        };

        ws.onclose = () => {
          console.log('[GUARDED_AGENT] WebSocket closed');
        };
      } catch (error) {
        console.warn('[GUARDED_AGENT] Backend send failed', error);
      }
    }

    options.onProgress?.('complete', { tabId: capturedTabId });
  } catch (error) {
    console.error('[GUARDED_AGENT] Run error', error);

    // Only update error state if tab still exists
    const currentTabsState = useTabsStore.getState();
    const tabStillExists = currentTabsState.tabs.find((t: any) => t.id === capturedTabId);
    if (tabStillExists) {
      useTabsStore.getState().updateTab(capturedTabId, {
        // Add error state if needed
      });
    }
  } finally {
    // Clean up
    activeRuns.delete(capturedTabId);
    console.log('[GUARDED_AGENT] Run complete for tab', capturedTabId);
  }
}

/**
 * Cancel any active run for a tab
 */
export function cancelAgentRun(tabId: string): void {
  const run = activeRuns.get(tabId);
  if (run?.abortController) {
    run.abortController.abort();
    console.log('[GUARDED_AGENT] Cancelled run for tab', tabId);
  }
  activeRuns.delete(tabId);
}

/**
 * Cancel all active runs
 */
export function cancelAllAgentRuns(): void {
  activeRuns.forEach((run, tabId) => {
    if (run.abortController) {
      run.abortController.abort();
    }
  });
  activeRuns.clear();
  console.log('[GUARDED_AGENT] Cancelled all runs');
}
