/**
 * Multi-Agent Layered System
 * Specialized agents for Trade, Research, Dev, Document, and Workflow modes
 */
import { streamingOrchestrator } from '../streaming/orchestrator';
import { extractAndChunkPage, getPartialSummary } from '../extraction/chunker';
import { localCache } from '../cache/localCache';
/**
 * Base Agent Class
 */
class BaseAgent {
    mode;
    context;
    constructor(mode, context) {
        this.mode = mode;
        this.context = context;
    }
}
/**
 * Trade Agent - Specialized for trading operations
 */
export class TradeAgent extends BaseAgent {
    constructor(context) {
        super('trade', context);
    }
    getCapabilities() {
        return [
            'Real-time market data analysis',
            'Trade signal generation',
            'Portfolio optimization',
            'Risk assessment',
            'Order execution',
        ];
    }
    async execute(query) {
        const runId = await streamingOrchestrator.startAgent(query, {
            tabId: this.context.tabId,
            sessionId: this.context.sessionId,
            url: this.context.url,
            context: JSON.stringify({
                mode: 'trade',
                capabilities: this.getCapabilities(),
            }),
        });
        // Trade-specific processing
        const actions = [];
        // Analyze query for trade intent
        if (query.toLowerCase().includes('buy') || query.toLowerCase().includes('sell')) {
            actions.push({
                type: 'navigate',
                args: {
                    url: 'https://www.tradingview.com/chart/',
                },
                requiresConsent: true,
                risk: 'high',
            });
        }
        // Get market data if requested
        if (query.toLowerCase().includes('price') || query.toLowerCase().includes('market')) {
            // Cache market data
            const cacheKey = `trade:market:${Date.now()}`;
            const cached = await localCache.get(cacheKey);
            if (!cached) {
                // Fetch and cache market data
                actions.push({
                    type: 'extract',
                    args: {
                        selector: '.market-data',
                        url: this.context.url,
                    },
                    requiresConsent: false,
                    risk: 'low',
                });
            }
        }
        return {
            success: true,
            runId,
            actions,
        };
    }
}
/**
 * Research Agent - Multi-source research with LLM
 */
export class ResearchAgent extends BaseAgent {
    constructor(context) {
        super('research', context);
    }
    getCapabilities() {
        return [
            'Multi-source search',
            'Content extraction',
            'Progressive summarization',
            'Citation tracking',
            'Fact verification',
            'Cross-reference analysis',
        ];
    }
    async execute(query) {
        const runId = await streamingOrchestrator.startAgent(query, {
            tabId: this.context.tabId,
            sessionId: this.context.sessionId,
            url: this.context.url,
            context: JSON.stringify({
                mode: 'research',
                capabilities: this.getCapabilities(),
            }),
        });
        const actions = [];
        // Extract and chunk page if URL provided
        if (this.context.url) {
            try {
                const { chunks, metadata } = await extractAndChunkPage(this.context.url);
                // Get fast partial summary
                const partialSummary = await getPartialSummary(chunks, 3);
                // Cache results
                await localCache.set(`research:${this.context.url}`, {
                    chunks,
                    metadata,
                    partialSummary,
                }, {
                    ttl: 3600,
                    tags: ['research', 'extraction'],
                });
                actions.push({
                    type: 'summarize',
                    args: {
                        text: partialSummary,
                        url: this.context.url,
                    },
                    requiresConsent: false,
                    risk: 'low',
                });
            }
            catch (error) {
                console.error('[ResearchAgent] Extraction failed:', error);
            }
        }
        // Multi-source search
        actions.push({
            type: 'extract',
            args: {
                query,
                sources: ['web', 'local', 'cache'],
            },
            requiresConsent: false,
            risk: 'low',
        });
        return {
            success: true,
            runId,
            actions,
        };
    }
}
/**
 * Dev Agent - Auto-debug and code extraction
 */
export class DevAgent extends BaseAgent {
    constructor(context) {
        super('dev', context);
    }
    getCapabilities() {
        return [
            'Code extraction',
            'Auto-debugging',
            'Error analysis',
            'Performance profiling',
            'Code review',
            'Documentation generation',
        ];
    }
    async execute(query) {
        const runId = await streamingOrchestrator.startAgent(query, {
            tabId: this.context.tabId,
            sessionId: this.context.sessionId,
            url: this.context.url,
            context: JSON.stringify({
                mode: 'dev',
                capabilities: this.getCapabilities(),
            }),
        });
        const actions = [];
        // Extract code if URL is a code repository or file
        if (this.context.url &&
            (this.context.url.includes('github.com') || this.context.url.includes('gitlab.com'))) {
            actions.push({
                type: 'extract',
                args: {
                    selector: 'pre, code, .code-block',
                    url: this.context.url,
                },
                requiresConsent: false,
                risk: 'low',
            });
        }
        // Debug analysis
        if (query.toLowerCase().includes('error') || query.toLowerCase().includes('debug')) {
            actions.push({
                type: 'extract',
                args: {
                    selector: '.error, .console, .log',
                    url: this.context.url,
                },
                requiresConsent: false,
                risk: 'low',
            });
        }
        return {
            success: true,
            runId,
            actions,
        };
    }
}
/**
 * Document Agent - PDF/Doc insights and actions
 */
export class DocumentAgent extends BaseAgent {
    constructor(context) {
        super('document', context);
    }
    getCapabilities() {
        return [
            'PDF parsing',
            'Document summarization',
            'Key insight extraction',
            'Table extraction',
            'Action item identification',
            'Document comparison',
        ];
    }
    async execute(query) {
        const runId = await streamingOrchestrator.startAgent(query, {
            tabId: this.context.tabId,
            sessionId: this.context.sessionId,
            url: this.context.url,
            context: JSON.stringify({
                mode: 'document',
                capabilities: this.getCapabilities(),
            }),
        });
        const actions = [];
        // Check if URL is a document
        if (this.context.url &&
            (this.context.url.endsWith('.pdf') ||
                this.context.url.endsWith('.doc') ||
                this.context.url.endsWith('.docx'))) {
            actions.push({
                type: 'extract',
                args: {
                    url: this.context.url,
                    type: 'document',
                },
                requiresConsent: false,
                risk: 'low',
            });
        }
        // Extract insights
        actions.push({
            type: 'summarize',
            args: {
                query,
                documentUrl: this.context.url,
            },
            requiresConsent: false,
            risk: 'low',
        });
        return {
            success: true,
            runId,
            actions,
        };
    }
}
/**
 * Workflow Agent - Arc-like automated workflows
 */
export class WorkflowAgent extends BaseAgent {
    constructor(context) {
        super('workflow', context);
    }
    getCapabilities() {
        return [
            'Multi-step automation',
            'Workflow orchestration',
            'Conditional logic',
            'Error recovery',
            'Progress tracking',
            'Workflow templates',
        ];
    }
    async execute(query) {
        const runId = await streamingOrchestrator.startAgent(query, {
            tabId: this.context.tabId,
            sessionId: this.context.sessionId,
            url: this.context.url,
            context: JSON.stringify({
                mode: 'workflow',
                capabilities: this.getCapabilities(),
            }),
        });
        // Parse workflow from query
        const workflow = this.parseWorkflow(query);
        const actions = [];
        // Execute workflow steps
        for (const step of workflow.steps) {
            actions.push({
                type: step.type,
                args: step.args,
                requiresConsent: step.requiresConsent || false,
                risk: step.risk || 'low',
            });
        }
        return {
            success: true,
            runId,
            actions,
        };
    }
    parseWorkflow(query) {
        // Simple workflow parser (can be enhanced with LLM)
        const steps = [];
        // Example: "Open example.com, extract content, summarize"
        if (query.includes('open') && query.includes('extract')) {
            const urlMatch = query.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                steps.push({
                    type: 'navigate',
                    args: { url: urlMatch[0] },
                    requiresConsent: false,
                    risk: 'low',
                });
                steps.push({
                    type: 'extract',
                    args: { url: urlMatch[0] },
                    requiresConsent: false,
                    risk: 'low',
                });
                steps.push({
                    type: 'summarize',
                    args: { url: urlMatch[0] },
                    requiresConsent: false,
                    risk: 'low',
                });
            }
        }
        return { steps };
    }
}
/**
 * Multi-Agent System Manager
 */
class MultiAgentSystem {
    agents = new Map();
    /**
     * Get or create agent for mode
     */
    getAgent(mode, context) {
        if (!this.agents.has(mode)) {
            let agent;
            switch (mode) {
                case 'trade':
                    agent = new TradeAgent(context);
                    break;
                case 'research':
                    agent = new ResearchAgent(context);
                    break;
                case 'dev':
                    agent = new DevAgent(context);
                    break;
                case 'document':
                    agent = new DocumentAgent(context);
                    break;
                case 'workflow':
                    agent = new WorkflowAgent(context);
                    break;
                default:
                    agent = new ResearchAgent(context); // Default fallback
            }
            this.agents.set(mode, agent);
        }
        return this.agents.get(mode);
    }
    /**
     * Execute query with appropriate agent
     */
    async execute(mode, query, context) {
        const agent = this.getAgent(mode, context);
        return await agent.execute(query);
    }
    /**
     * Get agent capabilities
     */
    getCapabilities(mode, context) {
        const agent = this.getAgent(mode, context);
        return agent.getCapabilities();
    }
    /**
     * Execute batch with multiple agents
     */
    async executeBatch(tasks) {
        const results = await Promise.all(tasks.map(task => this.execute(task.mode, task.query, task.context)));
        return results;
    }
}
// Singleton instance
export const multiAgentSystem = new MultiAgentSystem();
