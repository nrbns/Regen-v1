/**
 * Agent Client - Frontend Integration
 * Calls Tauri commands for agent research and execution
 */
import { invoke } from '@tauri-apps/api/core';
/**
 * Call research agent
 */
export async function researchAgent(request) {
    try {
        const response = await invoke('research_agent', { request });
        return response;
    }
    catch (error) {
        console.error('[Agent] Research failed:', error);
        throw error;
    }
}
/**
 * Execute agent actions
 */
export async function executeAgent(request) {
    try {
        const response = await invoke('execute_agent', { request });
        return response;
    }
    catch (error) {
        console.error('[Agent] Execution failed:', error);
        throw error;
    }
}
/**
 * Start streaming agent research
 */
export async function researchAgentStream(request) {
    try {
        // Extract page text if URL provided
        let pageText;
        if (request.url) {
            try {
                const extracted = await invoke('extract_page_text', { url: request.url });
                pageText = extracted.text;
            }
            catch (err) {
                console.warn('[Agent] Failed to extract page text:', err);
            }
        }
        await invoke('research_agent_stream', {
            request: {
                ...request,
                context: pageText ? pageText.substring(0, 2000) : request.context,
            },
        });
    }
    catch (error) {
        console.error('[Agent] Stream failed:', error);
        throw error;
    }
}
/**
 * Listen for agent events (Tauri window events)
 */
export async function onAgentEventStream(callback) {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen('agent-event', (event) => {
        callback(event.payload);
    });
    return unlisten;
}
/**
 * Listen for agent events (legacy window events)
 */
export function onAgentEvent(event, callback) {
    const handler = (event) => {
        callback(event.detail);
    };
    window.addEventListener(event, handler);
    return () => {
        window.removeEventListener(event, handler);
    };
}
