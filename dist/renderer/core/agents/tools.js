import { semanticSearchMemories } from '../supermemory/search';
import { processMemoryEvent } from '../supermemory/pipeline';
import { dispatch } from '../redix/runtime';
import { aiEngine } from '../ai';
async function defaultRedixAsk(prompt) {
    // First attempt via Sprint 2 AI orchestrator
    try {
        const result = await aiEngine.runTask({ kind: 'agent', prompt });
        if (result.text?.trim()) {
            return result.text;
        }
    }
    catch (error) {
        console.warn('[AgentTools] aiEngine redixAsk fallback triggered:', error);
    }
    // Fallback to legacy Redix dispatch
    try {
        const response = await dispatch({
            type: 'redix:agent:query',
            payload: { prompt },
            source: 'agent-runtime',
        });
        return response?.payload?.text || '';
    }
    catch (error) {
        console.warn('[AgentTools] legacy redixAsk failed:', error);
        return '';
    }
}
async function defaultFetch(url, init) {
    const safeUrl = new URL(url);
    if (!['http:', 'https:'].includes(safeUrl.protocol)) {
        throw new Error('Only http/https allowed');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
        const res = await fetch(safeUrl.toString(), {
            ...init,
            signal: controller.signal,
            headers: {
                'User-Agent': 'RedixAgent/1.0',
                ...(init?.headers || {}),
            },
        });
        return res;
    }
    finally {
        clearTimeout(timeout);
    }
}
export const agentTools = {
    'memory.search': {
        id: 'memory.search',
        description: 'Search personal SuperMemory for relevant context.',
        requiredCapabilities: ['memory:read'],
        async run(input, _ctx) {
            const query = String(input.query || input.prompt || '');
            if (!query)
                return [];
            const results = await semanticSearchMemories(query, { limit: Number(input.limit) || 8 });
            return results.map(result => ({
                id: result.event.id,
                similarity: result.similarity,
                title: result.event.metadata?.title,
                url: result.event.metadata?.url,
                tags: result.event.metadata?.tags,
                snippet: result.chunkText,
            }));
        },
    },
    'memory.saveNote': {
        id: 'memory.saveNote',
        description: 'Save a note to SuperMemory',
        requiredCapabilities: ['memory:write'],
        async run(input, _ctx) {
            const value = String(input.title || input.prompt || input.text || '');
            if (!value)
                throw new Error('Note text required');
            const eventId = await processMemoryEvent({
                type: 'note',
                value,
                metadata: {
                    url: input.url ? String(input.url) : undefined,
                    notePreview: String(input.text || value).slice(0, 280),
                    tags: Array.isArray(input.tags) ? input.tags.map(String) : undefined,
                },
            }).then(res => res.eventId);
            return { eventId };
        },
    },
    'redix.ask': {
        id: 'redix.ask',
        description: 'Ask the Redix core workflow for an answer.',
        requiredCapabilities: ['redix:ask'],
        async run(input, ctx) {
            const prompt = String(input.prompt || input.query || '');
            if (!prompt)
                return '';
            const answer = await (ctx?.redixAsk ? ctx.redixAsk(prompt) : defaultRedixAsk(prompt));
            return answer;
        },
    },
    'web.fetch': {
        id: 'web.fetch',
        description: 'Make a safe HTTP GET request for public data.',
        requiredCapabilities: ['web:fetch'],
        async run(input, ctx) {
            const url = String(input.url);
            const response = await (ctx.safeFetch || defaultFetch)(url);
            const text = await response.text();
            const headerPairs = [];
            response.headers.forEach((value, key) => {
                headerPairs.push([key, value]);
            });
            return {
                status: response.status,
                headers: Object.fromEntries(headerPairs),
                text,
            };
        },
    },
    'trade.fetchQuote': {
        id: 'trade.fetchQuote',
        description: 'Fetch real-time stock quote data for a symbol (e.g., AAPL, TSLA).',
        requiredCapabilities: ['web:fetch'],
        async run(input, _ctx) {
            const symbol = String(input.symbol || '').toUpperCase();
            if (!symbol)
                throw new Error('Stock symbol required');
            try {
                const { fetchTradeQuote } = await import('../trade/dataService');
                const quote = await fetchTradeQuote(symbol);
                return {
                    symbol: quote.symbol,
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    volume: quote.volume,
                    sentiment: quote.sentiment,
                    updatedAt: quote.updatedAt,
                };
            }
            catch (error) {
                console.warn('[AgentTools] trade.fetchQuote failed:', error);
                throw new Error(`Failed to fetch quote for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    },
    'image.search': {
        id: 'image.search',
        description: 'Search for images based on a query. Returns image URLs and metadata.',
        requiredCapabilities: ['web:fetch'],
        async run(input, _ctx) {
            const query = String(input.query || input.prompt || '');
            if (!query)
                throw new Error('Image search query required');
            // For now, use a mock/placeholder implementation
            // In production, this would call an image search API
            try {
                const { MockImageEngine } = await import('../../modes/images/engines');
                const engine = new MockImageEngine();
                const imageUrls = engine.generate(query);
                return {
                    query,
                    images: imageUrls.map((url, idx) => ({
                        url,
                        index: idx,
                        thumbnail: url,
                    })),
                    count: imageUrls.length,
                };
            }
            catch (error) {
                console.warn('[AgentTools] image.search failed:', error);
                return {
                    query,
                    images: [],
                    count: 0,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    },
    'threat.scan': {
        id: 'threat.scan',
        description: 'Scan a URL for security threats, vulnerabilities, and malware indicators.',
        requiredCapabilities: ['web:fetch'],
        async run(input, ctx) {
            const url = String(input.url || '');
            if (!url)
                throw new Error('URL required for threat scan');
            try {
                // Try IPC threat scan if available
                const scanResult = await window.api?.threats?.scanUrl?.(url);
                if (scanResult) {
                    return scanResult;
                }
                // Fallback: Basic security check via fetch
                try {
                    const response = await (ctx.safeFetch || defaultFetch)(url, {
                        method: 'HEAD',
                    });
                    return {
                        url,
                        riskLevel: response.status >= 400 ? 'high' : 'medium',
                        threats: [
                            {
                                type: 'HTTP Status Check',
                                severity: response.status >= 400 ? 'high' : 'low',
                                description: `HTTP status: ${response.status}`,
                                recommendation: response.status >= 400 ? 'URL returned an error status' : 'URL is accessible',
                            },
                        ],
                        scannedAt: Date.now(),
                    };
                }
                catch {
                    return {
                        url,
                        riskLevel: 'high',
                        threats: [
                            {
                                type: 'Connection Error',
                                severity: 'high',
                                description: 'Failed to connect to URL',
                                recommendation: 'URL may be unreachable or blocked',
                            },
                        ],
                        scannedAt: Date.now(),
                    };
                }
            }
            catch (error) {
                console.warn('[AgentTools] threat.scan failed:', error);
                throw new Error(`Threat scan failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    },
    'graph.query': {
        id: 'graph.query',
        description: 'Query the knowledge graph for nodes, edges, and relationships.',
        requiredCapabilities: ['memory:read'],
        async run(input, _ctx) {
            const query = String(input.query || input.prompt || '');
            if (!query)
                throw new Error('Graph query required');
            try {
                // Search SuperMemory for related content
                const memoryResults = await semanticSearchMemories(query, { limit: 10 });
                // Try to get graph data from IPC if available
                const graphData = await window.api?.graph?.all?.();
                // Build graph nodes from memory results
                const nodes = memoryResults.map(result => ({
                    key: result.event.id,
                    title: result.event.metadata?.title || result.event.value?.slice(0, 50),
                    type: result.event.type,
                    similarity: result.similarity,
                }));
                // Build edges from relationships (simplified)
                const edges = [];
                for (let i = 0; i < nodes.length - 1; i++) {
                    if (nodes[i].similarity && nodes[i + 1].similarity && nodes[i].similarity > 0.7) {
                        edges.push({
                            src: nodes[i].key,
                            dst: nodes[i + 1].key,
                            rel: 'related',
                        });
                    }
                }
                return {
                    query,
                    nodes: graphData?.nodes || nodes,
                    edges: graphData?.edges || edges,
                    nodeCount: (graphData?.nodes || nodes).length,
                    edgeCount: (graphData?.edges || edges).length,
                };
            }
            catch (error) {
                console.warn('[AgentTools] graph.query failed:', error);
                return {
                    query,
                    nodes: [],
                    edges: [],
                    nodeCount: 0,
                    edgeCount: 0,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    },
    'doc.summarize': {
        id: 'doc.summarize',
        description: 'Summarize a document or text content. Extracts key points and main ideas.',
        requiredCapabilities: ['redix:ask'],
        async run(input, ctx) {
            const text = String(input.text || input.content || '');
            const url = input.url ? String(input.url) : undefined;
            if (!text && !url)
                throw new Error('Text content or URL required');
            try {
                let content = text;
                // If URL provided, fetch content
                if (url && !text) {
                    const response = await (ctx.safeFetch || defaultFetch)(url);
                    content = await response.text();
                }
                // Use Redix to summarize
                const summaryPrompt = `Summarize the following document. Provide:
1. Key points (3-5 bullet points)
2. Main ideas
3. Important details

Document:
${content.slice(0, 4000)}`; // Limit to 4000 chars
                const summary = await (ctx.redixAsk
                    ? ctx.redixAsk(summaryPrompt)
                    : defaultRedixAsk(summaryPrompt));
                return {
                    summary,
                    keyPoints: summary
                        .split('\n')
                        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•')),
                    wordCount: content.split(/\s+/).length,
                    url,
                };
            }
            catch (error) {
                console.warn('[AgentTools] doc.summarize failed:', error);
                throw new Error(`Document summarization failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    },
    'n8n.workflow': {
        id: 'n8n.workflow',
        description: 'Call an n8n workflow via webhook. Supports single calls and loops.',
        requiredCapabilities: ['web:fetch'],
        async run(input, _ctx) {
            const workflowId = String(input.workflowId || '');
            if (!workflowId)
                throw new Error('Workflow ID is required');
            try {
                const { callN8nWorkflow, runN8nWorkflowLoop } = await import('../../services/n8nService');
                const call = {
                    workflowId,
                    data: input.data || {},
                    language: input.language ? String(input.language) : undefined,
                    sourceMode: input.sourceMode ? String(input.sourceMode) : undefined,
                    metadata: input.metadata || {},
                };
                // Check if this is a loop request
                const isLoop = Boolean(input.loop);
                const loopInterval = input.loopInterval ? Number(input.loopInterval) : undefined;
                const maxIterations = input.maxIterations ? Number(input.maxIterations) : undefined;
                if (isLoop) {
                    // Run workflow in loop
                    const results = await runN8nWorkflowLoop(call, {
                        workflowId,
                        interval: loopInterval,
                        maxIterations: maxIterations || 10,
                        condition: input.loopCondition
                            ? result => {
                                // Simple condition: continue if successful
                                // Can be enhanced with custom condition logic
                                return result.success;
                            }
                            : undefined,
                    });
                    return {
                        workflowId,
                        loop: true,
                        iterations: results.length,
                        results: results.map(r => ({
                            success: r.success,
                            data: r.data,
                            error: r.error,
                        })),
                        lastResult: results[results.length - 1],
                    };
                }
                else {
                    // Single workflow call
                    const result = await callN8nWorkflow(call);
                    return {
                        workflowId,
                        success: result.success,
                        data: result.data,
                        executionId: result.executionId,
                        error: result.error,
                    };
                }
            }
            catch (error) {
                console.warn('[AgentTools] n8n.workflow failed:', error);
                throw new Error(`n8n workflow call failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    },
    'n8n.list': {
        id: 'n8n.list',
        description: 'List available n8n workflows (requires API key).',
        requiredCapabilities: ['web:fetch'],
        async run(_input, _ctx) {
            try {
                const { listN8nWorkflows } = await import('../../services/n8nService');
                const workflows = await listN8nWorkflows();
                return {
                    workflows: workflows.map(w => ({
                        id: w.id,
                        name: w.name,
                        description: w.description,
                    })),
                    count: workflows.length,
                };
            }
            catch (error) {
                console.warn('[AgentTools] n8n.list failed:', error);
                return {
                    workflows: [],
                    count: 0,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    },
};
