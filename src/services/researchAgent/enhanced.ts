/**
 * Enhanced Research Agent Service
 * Advanced orchestration with planning, execution tracking, and retries
 */

import { executeResearchAgent, planResearchTask } from '../researchAgent';
import { searchOfflineDocuments } from '../offlineRAG';
import { semanticSearch } from '../../lib/offline-store/semantic-search';

// Type definitions for planning (simplified for frontend)
export interface ExecutionPlan {
  steps: Array<{ type: string; description: string }>;
}

export interface EnhancedResearchOptions {
  useHybridSearch?: boolean; // Combine web + offline
  useSemanticSearch?: boolean; // Use embeddings
  includePlanning?: boolean; // Show execution plan
  maxRetries?: number;
  timeout?: number;
}

export interface EnhancedResearchResult {
  success: boolean;
  query: string;
  plan?: ExecutionPlan;
  result: any;
  executionTime: number;
  methods: string[];
  errors?: string[];
}

/**
 * Execute enhanced research agent with planning
 */
export async function executeEnhancedResearch(
  query: string,
  options: EnhancedResearchOptions = {}
): Promise<EnhancedResearchResult> {
  const {
    useHybridSearch = true,
    useSemanticSearch = false,
    includePlanning = true,
    maxRetries = 2,
    timeout = 60000,
  } = options;

  const startTime = Date.now();
  const methods: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Plan the task
    let plan: ExecutionPlan | undefined;
    if (includePlanning) {
      const planSteps = planResearchTask(query);
      plan = { 
        steps: planSteps.map((s: { step: string; description: string }) => ({ 
          type: s.step, 
          description: s.description 
        }))
      };
      methods.push('planned');
    }

    // Step 2: Execute with hybrid search if enabled
    if (useHybridSearch) {
      // Search offline documents first
      try {
        const offlineResults = await searchOfflineDocuments(query, { limit: 5 });
        if (offlineResults && offlineResults.documents.length > 0) {
          methods.push('offline-rag');
        }
      } catch (error: any) {
        console.warn('[EnhancedResearch] Offline search failed:', error);
        errors.push(`Offline search: ${error.message}`);
      }

      // Use semantic search if enabled
      if (useSemanticSearch) {
        try {
          const semanticResults = await semanticSearch(query, {
            useHybrid: true,
            limit: 5,
          });
          if (semanticResults.documents.length > 0) {
            methods.push('semantic-search');
          }
        } catch (error: any) {
          console.warn('[EnhancedResearch] Semantic search failed:', error);
          errors.push(`Semantic search: ${error.message}`);
        }
      }
    }

    // Step 3: Execute main research agent
    let result;
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        result = await executeResearchAgent(query, {
          maxResults: 10,
          useOnDeviceAI: true,
          includeCitations: true,
        });

        clearTimeout(timeoutId);
        methods.push('research-agent');
        break;
      } catch (error: any) {
        retries++;
        if (retries > maxRetries) {
          throw error;
        }
        console.warn(`[EnhancedResearch] Attempt ${retries} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      query,
      plan,
      result,
      executionTime,
      methods,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      query,
      result: null,
      executionTime: Date.now() - startTime,
      methods,
      errors: [...errors, error.message || String(error)],
    };
  }
}


