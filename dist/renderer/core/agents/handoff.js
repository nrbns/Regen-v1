/**
 * Multi-Agent Handoff System
 * Enables agents to pass data and trigger actions in other modes
 */
import { ipc } from '../../lib/ipc-typed';
import { useSettingsStore } from '../../state/settingsStore';
import { toast } from 'react-hot-toast';
/**
 * Send handoff from one agent/mode to another
 */
export async function sendHandoff(payload) {
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
    }
    catch (error) {
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
async function handoffToResearch(payload, language) {
    try {
        const query = payload.data.query || payload.data.summary;
        if (!query) {
            return { success: false, error: 'No query or summary provided for research' };
        }
        // Switch to Research mode if not already there
        try {
            const { useAppStore } = await import('../../state/appStore');
            const currentMode = useAppStore.getState().mode;
            if (currentMode !== 'Research') {
                useAppStore.getState().setMode('Research');
                // Small delay to allow mode switch
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        catch (error) {
            console.debug('[Handoff] Failed to switch to Research mode:', error);
        }
        // Dispatch custom event for research mode to handle
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('handoff:research', {
                detail: {
                    query,
                    language,
                    symbol: payload.data.symbol,
                    sourceMode: payload.sourceMode,
                },
            }));
        }
        // Trigger research query
        try {
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
        }
        catch (error) {
            // If IPC fails, still return success since we dispatched the event
            console.debug('[Handoff] Research IPC failed, using event only:', error);
            return {
                success: true,
                data: { query, language },
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Research handoff failed',
        };
    }
}
/**
 * Handoff to Trade mode
 */
async function handoffToTrade(payload, _language) {
    try {
        const symbol = payload.data.symbol;
        const action = payload.data.action;
        const message = payload.data.message || payload.data.summary;
        if (!symbol && !message) {
            return { success: false, error: 'No symbol or message provided for trade' };
        }
        // Switch to Trade mode if not already there
        try {
            const { useAppStore } = await import('../../state/appStore');
            const currentMode = useAppStore.getState().mode;
            if (currentMode !== 'Trade') {
                useAppStore.getState().setMode('Trade');
                // Small delay to allow mode switch
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        catch (error) {
            console.debug('[Handoff] Failed to switch to Trade mode:', error);
        }
        // Create trade alert or signal
        if (action === 'alert' || action === 'signal') {
            const alertMessage = message || `Alert for ${symbol}`;
            // Show toast notification
            toast.success(alertMessage, {
                duration: 5000,
                icon: '📈',
            });
            // Dispatch custom event for trade mode to handle
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('handoff:trade', {
                    detail: {
                        symbol,
                        action,
                        message,
                        summary: payload.data.summary,
                        sourceMode: payload.sourceMode,
                    },
                }));
            }
            // Optionally trigger IPC event for trade mode
            try {
                const activeTab = await ipc.tabs.list().then((tabs) => tabs.find((t) => t.active) || tabs[0]);
                if (activeTab) {
                    await ipc.crossReality?.handoff?.(activeTab.id, 'mobile');
                }
            }
            catch {
                // IPC might not be available, that's okay
                console.debug('[Handoff] Trade IPC not available, using toast only');
            }
        }
        return {
            success: true,
            data: { symbol, action, message },
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Trade handoff failed',
        };
    }
}
/**
 * Handoff to n8n workflow
 */
export async function handoffToN8n(payload, language) {
    try {
        const workflowId = payload.data.workflowId;
        const workflowUrl = payload.data.workflowUrl;
        const isLoop = Boolean(payload.data.loop);
        const loopInterval = payload.data.loopInterval ? Number(payload.data.loopInterval) : undefined;
        const maxIterations = payload.data.maxIterations
            ? Number(payload.data.maxIterations)
            : undefined;
        if (!workflowId) {
            return { success: false, error: 'No workflow ID provided' };
        }
        // Use n8n service
        const { callN8nWorkflow, runN8nWorkflowLoop } = await import('../../services/n8nService');
        const call = {
            workflowId,
            data: payload.data,
            language,
            sourceMode: payload.sourceMode,
            metadata: payload.metadata,
        };
        const config = workflowUrl ? { baseUrl: workflowUrl } : undefined;
        if (isLoop) {
            // Run workflow in loop
            const results = await runN8nWorkflowLoop(call, {
                workflowId,
                interval: loopInterval || 1000,
                maxIterations: maxIterations || 10,
            }, config);
            const lastResult = results[results.length - 1];
            toast.success(`Workflow loop completed: ${workflowId} (${results.length} iterations)`, {
                duration: 3000,
            });
            return {
                success: lastResult?.success || false,
                targetId: workflowId,
                data: {
                    iterations: results.length,
                    results,
                    lastResult,
                },
            };
        }
        else {
            // Single workflow call
            const result = await callN8nWorkflow(call, config);
            if (result.success) {
                toast.success(`Workflow triggered: ${workflowId}`, {
                    duration: 3000,
                });
            }
            else {
                toast.error(`Workflow failed: ${result.error}`, {
                    duration: 5000,
                });
            }
            return {
                success: result.success,
                targetId: workflowId,
                data: result.data,
                error: result.error,
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'n8n handoff failed',
        };
    }
}
/**
 * Handoff to Browse mode (open URL in tab)
 */
async function handoffToBrowse(payload, _language) {
    try {
        const url = payload.data.url;
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
    }
    catch (error) {
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
export async function researchToTrade(researchSummary, symbol, language) {
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
export async function tradeToResearch(symbol, query, language) {
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
