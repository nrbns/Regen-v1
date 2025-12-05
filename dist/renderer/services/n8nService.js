/**
 * n8n Workflow Service
 * Handles workflow calls, loops, and execution
 */
/**
 * Get n8n configuration from environment or settings
 */
function getN8nConfig() {
    const baseUrl = import.meta.env.VITE_N8N_BASE_URL || import.meta.env.N8N_BASE_URL || 'http://localhost:5678';
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || import.meta.env.N8N_WEBHOOK_URL || `${baseUrl}/webhook`;
    const apiKey = import.meta.env.VITE_N8N_API_KEY || import.meta.env.N8N_API_KEY;
    return {
        baseUrl,
        webhookUrl,
        apiKey,
    };
}
/**
 * Call an n8n workflow via webhook
 */
export async function callN8nWorkflow(call, config) {
    const n8nConfig = { ...getN8nConfig(), ...config };
    if (!call.workflowId) {
        return {
            success: false,
            workflowId: call.workflowId || 'unknown',
            error: 'Workflow ID is required',
        };
    }
    try {
        // Build webhook URL
        const webhookUrl = n8nConfig.webhookUrl || `${n8nConfig.baseUrl}/webhook`;
        const url = `${webhookUrl}/${call.workflowId}`;
        // Prepare request body
        const body = {
            ...call.data,
            language: call.language,
            sourceMode: call.sourceMode,
            metadata: call.metadata,
            timestamp: Date.now(),
        };
        // Make request
        const headers = {
            'Content-Type': 'application/json',
        };
        // Add API key if available
        if (n8nConfig.apiKey) {
            headers['X-N8N-API-KEY'] = n8nConfig.apiKey;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`n8n workflow returned ${response.status}: ${errorText}`);
        }
        const result = await response.json().catch(() => ({}));
        return {
            success: true,
            workflowId: call.workflowId,
            data: result,
            executionId: result.executionId || result.id,
        };
    }
    catch (error) {
        console.error('[N8nService] Workflow call failed:', error);
        return {
            success: false,
            workflowId: call.workflowId,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Execute an n8n workflow in a loop
 * Continues until condition returns false or maxIterations is reached
 */
export async function runN8nWorkflowLoop(call, loopConfig, config) {
    const results = [];
    const interval = loopConfig.interval || 1000; // Default 1 second
    const maxIterations = loopConfig.maxIterations || 10; // Default 10 iterations
    let iteration = 0;
    let shouldContinue = true;
    while (shouldContinue && iteration < maxIterations) {
        iteration++;
        try {
            // Call workflow
            const result = await callN8nWorkflow(call, config);
            results.push(result);
            // Call iteration callback
            if (loopConfig.onIteration) {
                loopConfig.onIteration(result, iteration);
            }
            // Check condition
            if (loopConfig.condition) {
                shouldContinue = loopConfig.condition(result);
            }
            else {
                // Default: continue if successful
                shouldContinue = result.success;
            }
            // If continuing, wait for interval
            if (shouldContinue && iteration < maxIterations) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        catch (error) {
            const errorResult = {
                success: false,
                workflowId: call.workflowId,
                error: error instanceof Error ? error.message : String(error),
            };
            results.push(errorResult);
            if (loopConfig.onError) {
                loopConfig.onError(error instanceof Error ? error : new Error(String(error)));
            }
            // Stop loop on error unless condition says otherwise
            if (!loopConfig.condition || !loopConfig.condition(errorResult)) {
                shouldContinue = false;
            }
        }
    }
    // Call completion callback
    if (loopConfig.onComplete) {
        loopConfig.onComplete(results);
    }
    return results;
}
/**
 * List available n8n workflows (requires n8n API)
 */
export async function listN8nWorkflows(config) {
    const n8nConfig = { ...getN8nConfig(), ...config };
    if (!n8nConfig.apiKey) {
        console.warn('[N8nService] API key not configured, cannot list workflows');
        return [];
    }
    try {
        const url = `${n8nConfig.baseUrl}/api/v1/workflows`;
        const response = await fetch(url, {
            headers: {
                'X-N8N-API-KEY': n8nConfig.apiKey,
            },
        });
        if (!response.ok) {
            throw new Error(`n8n API returned ${response.status}`);
        }
        const workflows = await response.json();
        return Array.isArray(workflows)
            ? workflows.map((w) => ({
                id: w.id || w.name,
                name: w.name || 'Unnamed Workflow',
                description: w.description,
            }))
            : [];
    }
    catch (error) {
        console.error('[N8nService] Failed to list workflows:', error);
        return [];
    }
}
/**
 * Get workflow execution status
 */
export async function getN8nWorkflowExecution(executionId, config) {
    const n8nConfig = { ...getN8nConfig(), ...config };
    if (!n8nConfig.apiKey) {
        return null;
    }
    try {
        const url = `${n8nConfig.baseUrl}/api/v1/executions/${executionId}`;
        const response = await fetch(url, {
            headers: {
                'X-N8N-API-KEY': n8nConfig.apiKey,
            },
        });
        if (!response.ok) {
            return null;
        }
        const execution = await response.json();
        return {
            status: execution.finished ? 'finished' : 'running',
            data: execution.data,
        };
    }
    catch (error) {
        console.error('[N8nService] Failed to get execution status:', error);
        return null;
    }
}
