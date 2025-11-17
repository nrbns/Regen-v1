/**
 * Query Engine - Intent Detection and Agent Routing
 * 
 * Detects user intent and routes queries to appropriate agents:
 * - Research: Multi-source fusion, fact-checking
 * - Comparison: Product/service comparison
 * - Fact: Knowledge graph lookup
 * - Calculation: Math/computation
 * - Code: Code generation/execution
 */

// QueryEngine runs client-side and calls server endpoints
// Import types only, not server implementation

export type QueryIntent = 
  | 'research'      // General research query
  | 'comparison'    // Compare products/services
  | 'fact'          // Simple fact lookup
  | 'calculation'   // Math/computation
  | 'code'          // Code generation
  | 'timeline'      // Historical/timeline query
  | 'definition'    // Definition/explanation
  | 'unknown';      // Fallback

export interface QueryResult {
  answer: string;
  intent: QueryIntent;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  citations: Array<{
    index: number;
    url: string;
    title: string;
  }>;
  visualizations?: {
    type: 'chart' | 'table' | 'timeline' | 'comparison';
    data: any;
  };
  knowledgeGraph?: {
    nodes: Array<{ key: string; title: string; type: string }>;
    edges: Array<{ src: string; dst: string; rel: string }>;
  };
  contradictions?: Array<{
    fact: string;
    sources: string[];
    confidence: number;
  }>;
  ecoScore?: {
    score: number;
    tier: 'Ultra Green' | 'Green' | 'Yellow' | 'Red';
    co2Saved: number;
  };
  latency: number;
}

/**
 * Detect query intent using pattern matching and simple heuristics
 * In production, this could use an LLM for more accurate detection
 */
export function detectIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();
  
  // Comparison queries
  if (
    lowerQuery.includes('compare') ||
    lowerQuery.includes('vs') ||
    lowerQuery.includes('versus') ||
    lowerQuery.includes('better') ||
    lowerQuery.includes('best') && (lowerQuery.includes('under') || lowerQuery.includes('for'))
  ) {
    return 'comparison';
  }
  
  // Calculation queries
  if (
    lowerQuery.match(/\d+\s*[+\-*/]\s*\d+/) ||
    lowerQuery.includes('calculate') ||
    lowerQuery.includes('compute') ||
    lowerQuery.includes('math')
  ) {
    return 'calculation';
  }
  
  // Code queries
  if (
    lowerQuery.includes('code') ||
    lowerQuery.includes('function') ||
    lowerQuery.includes('program') ||
    lowerQuery.includes('script') ||
    lowerQuery.includes('algorithm')
  ) {
    return 'code';
  }
  
  // Timeline queries
  if (
    lowerQuery.includes('timeline') ||
    lowerQuery.includes('history') ||
    lowerQuery.includes('when did') ||
    lowerQuery.includes('evolution of')
  ) {
    return 'timeline';
  }
  
  // Definition queries
  if (
    lowerQuery.startsWith('what is') ||
    lowerQuery.startsWith('what are') ||
    lowerQuery.startsWith('define') ||
    lowerQuery.startsWith('meaning of')
  ) {
    return 'definition';
  }
  
  // Fact queries (simple, direct questions)
  if (
    lowerQuery.match(/^(who|what|where|when|how many|how much)\s+/) ||
    (lowerQuery.length < 50 && !lowerQuery.includes('research') && !lowerQuery.includes('find'))
  ) {
    return 'fact';
  }
  
  // Default to research for complex queries
  return 'research';
}

/**
 * Query Engine - Routes queries to appropriate agents
 * Client-side implementation that calls server endpoints
 */
export class QueryEngine {
  private redixUrl: string;
  
  constructor() {
    this.redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
  }
  
  /**
   * Process a user query and return structured answer
   */
  async query(
    userQuery: string,
    context?: {
      tabUrl?: string;
      tabTitle?: string;
      mode?: string;
    }
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const intent = detectIntent(userQuery);
    
    try {
      // Route to appropriate agent based on intent
      let result: QueryResult;
      
      switch (intent) {
        case 'comparison':
          result = await this.handleComparisonQuery(userQuery, context);
          break;
          
        case 'calculation':
          result = await this.handleCalculationQuery(userQuery);
          break;
          
        case 'code':
          result = await this.handleCodeQuery(userQuery, context);
          break;
          
        case 'fact':
        case 'definition':
          result = await this.handleFactQuery(userQuery, context);
          break;
          
        case 'timeline':
          result = await this.handleTimelineQuery(userQuery, context);
          break;
          
        case 'research':
        default:
          result = await this.handleResearchQuery(userQuery, context);
          break;
      }
      
      result.intent = intent;
      result.latency = Date.now() - startTime;
      
      return result;
    } catch (error: any) {
      console.error('[QueryEngine] Query failed:', error);
      
      // Return error result
      return {
        answer: `I encountered an error processing your query: ${error.message}. Please try rephrasing your question.`,
        intent,
        sources: [],
        citations: [],
        latency: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Handle research queries - Multi-source fusion
   */
  private async handleResearchQuery(
    query: string,
    context?: { tabUrl?: string; tabTitle?: string; mode?: string }
  ): Promise<QueryResult> {
    // Call Redix /workflow endpoint with RAG workflow type
    try {
      const response = await fetch(`${this.redixUrl}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: context?.tabTitle || context?.tabUrl || '',
          workflowType: 'rag',
          options: {
            maxIterations: 3,
            maxTokens: 1000,
            temperature: 0.7,
            useOllama: false,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Workflow failed: ${response.statusText}`);
      }
      
      const workflowResult = await response.json();
    
      // Extract sources from workflow result
      const sources: QueryResult['sources'] = [];
      const citations: QueryResult['citations'] = [];
      
      if (workflowResult.steps) {
        workflowResult.steps.forEach((step: any, idx: number) => {
          if (step.tool === 'web_search' && step.observation) {
            // Parse search results (simplified - in production, parse structured results)
            const lines = step.observation.split('\n').filter((l: string) => l.trim());
            lines.slice(0, 5).forEach((line: string) => {
              if (line.includes('http')) {
                const urlMatch = line.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                  sources.push({
                    url: urlMatch[0],
                    title: line.substring(0, 100) || 'Source',
                    snippet: line.substring(0, 200),
                  });
                  citations.push({
                    index: citations.length + 1,
                    url: urlMatch[0],
                    title: line.substring(0, 100) || 'Source',
                  });
                }
              }
            });
          }
        });
      }
      
      return {
        answer: workflowResult.result || workflowResult.text || 'No answer generated',
        intent: 'research',
        sources: sources.slice(0, 10),
        citations: citations.slice(0, 10),
        ecoScore: {
          score: workflowResult.greenScore || 75,
          tier: (workflowResult.greenScore || 75) >= 90 ? 'Ultra Green' :
                (workflowResult.greenScore || 75) >= 75 ? 'Green' :
                (workflowResult.greenScore || 75) >= 50 ? 'Yellow' : 'Red',
          co2Saved: workflowResult.co2SavedG || 0,
        },
        latency: workflowResult.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Research workflow failed:', error);
      // Fallback to simple answer
      return {
        answer: `I encountered an error processing your research query: ${error.message}. Please try again.`,
        intent: 'research',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
  
  /**
   * Handle comparison queries - Product/service comparison
   */
  private async handleComparisonQuery(
    query: string,
    context?: { tabUrl?: string; tabTitle?: string; mode?: string }
  ): Promise<QueryResult> {
    // Call Redix /workflow with research workflow (comparison agent not yet implemented)
    try {
      const response = await fetch(`${this.redixUrl}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: context?.tabTitle || '',
          workflowType: 'research',
          options: { maxIterations: 5, maxTokens: 1500 },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Workflow failed: ${response.statusText}`);
      }
      
      const workflowResult = await response.json();
    
      // Parse comparison data from result (simplified)
      // In production, use a specialized comparison agent
      const sources: QueryResult['sources'] = [];
      const citations: QueryResult['citations'] = [];
      
      // Extract URLs from workflow steps
      if (workflowResult.steps) {
        workflowResult.steps.forEach((step: any) => {
          if (step.observation && step.observation.includes('http')) {
            const urlMatch = step.observation.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              sources.push({
                url: urlMatch[0],
                title: step.observation.substring(0, 100) || 'Comparison Source',
                snippet: step.observation.substring(0, 200),
              });
            }
          }
        });
      }
      
      return {
        answer: workflowResult.result || workflowResult.text || 'No comparison generated',
        intent: 'comparison',
        sources: sources.slice(0, 10),
        citations: citations.slice(0, 10),
        visualizations: {
          type: 'comparison',
          data: { query, result: workflowResult.result },
        },
        ecoScore: {
          score: workflowResult.greenScore || 75,
          tier: (workflowResult.greenScore || 75) >= 90 ? 'Ultra Green' :
                (workflowResult.greenScore || 75) >= 75 ? 'Green' :
                (workflowResult.greenScore || 75) >= 50 ? 'Yellow' : 'Red',
          co2Saved: workflowResult.co2SavedG || 0,
        },
        latency: workflowResult.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Comparison workflow failed:', error);
      return {
        answer: `I encountered an error processing your comparison query: ${error.message}. Please try again.`,
        intent: 'comparison',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
  
  /**
   * Handle fact queries - Simple fact lookup
   */
  private async handleFactQuery(
    query: string,
    context?: { tabUrl?: string; tabTitle?: string; mode?: string }
  ): Promise<QueryResult> {
    // Call Redix /workflow with RAG workflow (faster, more focused)
    try {
      const response = await fetch(`${this.redixUrl}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: context?.tabTitle || '',
          workflowType: 'rag',
          options: {
            maxIterations: 2,
            maxTokens: 500,
            temperature: 0.3,
            useOllama: false,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Workflow failed: ${response.statusText}`);
      }
      
      const workflowResult = await response.json();
    
      const sources: QueryResult['sources'] = [];
      const citations: QueryResult['citations'] = [];
      
      // Extract sources
      if (workflowResult.steps) {
        workflowResult.steps.forEach((step: any) => {
          if (step.observation && step.observation.includes('http')) {
            const urlMatch = step.observation.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              sources.push({
                url: urlMatch[0],
                title: step.observation.substring(0, 100) || 'Fact Source',
                snippet: step.observation.substring(0, 200),
              });
            }
          }
        });
      }
      
      return {
        answer: workflowResult.result || workflowResult.text || 'No fact found',
        intent: 'fact',
        sources: sources.slice(0, 5),
        citations: citations.slice(0, 5),
        ecoScore: {
          score: workflowResult.greenScore || 75,
          tier: (workflowResult.greenScore || 75) >= 90 ? 'Ultra Green' :
                (workflowResult.greenScore || 75) >= 75 ? 'Green' :
                (workflowResult.greenScore || 75) >= 50 ? 'Yellow' : 'Red',
          co2Saved: workflowResult.co2SavedG || 0,
        },
        latency: workflowResult.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Fact query failed:', error);
      return {
        answer: `I encountered an error processing your fact query: ${error.message}. Please try again.`,
        intent: 'fact',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
  
  /**
   * Handle calculation queries
   */
  private async handleCalculationQuery(query: string): Promise<QueryResult> {
    // For calculations, call Redix /ask endpoint (simpler than full workflow)
    try {
      const response = await fetch(`${this.redixUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          maxTokens: 300,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Calculation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        answer: result.text || result.response || 'Calculation result unavailable',
        intent: 'calculation',
        sources: [],
        citations: [],
        ecoScore: {
          score: result.greenScore || 85,
          tier: (result.greenScore || 85) >= 90 ? 'Ultra Green' :
                (result.greenScore || 85) >= 75 ? 'Green' :
                (result.greenScore || 85) >= 50 ? 'Yellow' : 'Red',
          co2Saved: result.co2SavedG || 0,
        },
        latency: result.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Calculation failed:', error);
      return {
        answer: `I encountered an error processing your calculation: ${error.message}. Please try again.`,
        intent: 'calculation',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
  
  /**
   * Handle code queries
   */
  private async handleCodeQuery(
    query: string,
    context?: { tabUrl?: string; tabTitle?: string; mode?: string }
  ): Promise<QueryResult> {
    // Call Redix /workflow with multi-agent workflow
    try {
      const response = await fetch(`${this.redixUrl}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: context?.tabTitle || '',
          workflowType: 'multi-agent',
          options: { maxIterations: 5, maxTokens: 2000 },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Code workflow failed: ${response.statusText}`);
      }
      
      const workflowResult = await response.json();
      
      return {
        answer: workflowResult.result || workflowResult.text || 'No code generated',
        intent: 'code',
        sources: [],
        citations: [],
        ecoScore: {
          score: workflowResult.greenScore || 75,
          tier: (workflowResult.greenScore || 75) >= 90 ? 'Ultra Green' :
                (workflowResult.greenScore || 75) >= 75 ? 'Green' :
                (workflowResult.greenScore || 75) >= 50 ? 'Yellow' : 'Red',
          co2Saved: workflowResult.co2SavedG || 0,
        },
        latency: workflowResult.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Code query failed:', error);
      return {
        answer: `I encountered an error processing your code query: ${error.message}. Please try again.`,
        intent: 'code',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
  
  /**
   * Handle timeline queries
   */
  private async handleTimelineQuery(
    query: string,
    context?: { tabUrl?: string; tabTitle?: string; mode?: string }
  ): Promise<QueryResult> {
    // Call Redix /workflow with research workflow
    try {
      const response = await fetch(`${this.redixUrl}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: context?.tabTitle || '',
          workflowType: 'research',
          options: { maxIterations: 4, maxTokens: 1200 },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Timeline workflow failed: ${response.statusText}`);
      }
      
      const workflowResult = await response.json();
      
      return {
        answer: workflowResult.result || workflowResult.text || 'No timeline generated',
        intent: 'timeline',
        sources: [],
        citations: [],
        visualizations: {
          type: 'timeline',
          data: { query, result: workflowResult.result },
        },
        ecoScore: {
          score: workflowResult.greenScore || 75,
          tier: (workflowResult.greenScore || 75) >= 90 ? 'Ultra Green' :
                (workflowResult.greenScore || 75) >= 75 ? 'Green' :
                (workflowResult.greenScore || 75) >= 50 ? 'Yellow' : 'Red',
          co2Saved: workflowResult.co2SavedG || 0,
        },
        latency: workflowResult.latency || 0,
      };
    } catch (error: any) {
      console.error('[QueryEngine] Timeline query failed:', error);
      return {
        answer: `I encountered an error processing your timeline query: ${error.message}. Please try again.`,
        intent: 'timeline',
        sources: [],
        citations: [],
        latency: 0,
      };
    }
  }
}

// Singleton instance
let queryEngineInstance: QueryEngine | null = null;

export function getQueryEngine(): QueryEngine {
  if (!queryEngineInstance) {
    queryEngineInstance = new QueryEngine();
  }
  return queryEngineInstance;
}

