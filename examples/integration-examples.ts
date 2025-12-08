/**
 * Integration Examples
 * Complete examples showing how to use all enhanced features together
 */

// Example 1: Memory-Aware Research with Offline RAG
import { initializeRedixMode, getRedixStats } from '../src/lib/redix-mode/integration';
import { executeEnhancedResearch } from '../src/services/researchAgent/enhanced';
import { hybridSearch } from '../src/lib/offline-store/hybrid-search';
import { summarizeWithFallbacks } from '../src/services/onDeviceAI/enhanced';
import { unloadModel } from '../src/services/onDeviceAI/enhanced';

/**
 * Example 1: Memory-Aware Research
 * Combines Redix mode, offline RAG, and on-device AI
 */
export async function memoryAwareResearch(query: string) {
  // Initialize Redix mode
  initializeRedixMode();

  // Check memory
  const stats = getRedixStats();
  if (stats && stats.memoryMB > 400) {
    console.log('[Memory] High memory usage, unloading model');
    await unloadModel();
  }

  // Try offline search first
  try {
    const offlineResults = await hybridSearch(query, {
      limit: 5,
      keywordWeight: 0.4,
      semanticWeight: 0.5,
      metadataWeight: 0.1,
    });

    if (offlineResults.documents.length > 0) {
      const context = offlineResults.documents
        .map(doc => doc.document.content)
        .join('\n\n');

      const summary = await summarizeWithFallbacks(context, {
        maxLength: 300,
        preferOnDevice: true,
      });

      return {
        source: 'offline',
        summary: summary.summary,
        documents: offlineResults.documents,
        method: summary.method,
      };
    }
  } catch (error) {
    console.warn('[Research] Offline search failed:', error);
  }

  // Fallback to web research
  const webResult = await executeEnhancedResearch(query, {
    useHybridSearch: true,
    useSemanticSearch: true,
    preferOnDevice: true,
  });

  return webResult;
}

/**
 * Example 2: Complete Agent Workflow
 * Shows planning, execution, and result formatting
 */
import {
  planResearchTask,
  validatePlan,
  optimizePlan,
  executePlan,
} from '../server/agents/advanced-planner';

export async function completeAgentWorkflow(query: string) {
  // 1. Plan the task
  const plan = planResearchTask(query, {
    complexity: 'medium',
    maxSteps: 8,
    includeCounterpoints: false,
  });

  console.log('[Agent] Plan created:', plan.steps.length, 'steps');
  console.log('[Agent] Estimated time:', plan.estimatedTime, 's');
  console.log('[Agent] Estimated cost:', plan.estimatedCost, 'tokens/calls');

  // 2. Validate plan
  const validation = validatePlan(plan);
  if (!validation.valid) {
    console.error('[Agent] Plan validation failed:', validation.errors);
    return { success: false, errors: validation.errors };
  }

  if (validation.warnings.length > 0) {
    console.warn('[Agent] Plan warnings:', validation.warnings);
  }

  // 3. Optimize plan
  const optimized = optimizePlan(plan);
  console.log('[Agent] Plan optimized:', optimized.steps.length, 'steps');

  // 4. Execute plan
  const result = await executePlan(optimized);

  console.log('[Agent] Execution complete');
  console.log('[Agent] Completed steps:', result.completedSteps.length);
  console.log('[Agent] Failed steps:', result.failedSteps.length);
  console.log('[Agent] Execution time:', result.executionTime, 'ms');

  return result;
}

/**
 * Example 3: Multilingual Research Pipeline
 * Combines translation, search, and summarization
 */
import { translateOnDevice } from '../src/services/onDeviceAI';
// import { searchOfflineDocuments } from '../src/services/offlineRAG'; // Unused
import { semanticSearch } from '../src/lib/offline-store/semantic-search';

export async function multilingualResearch(
  query: string,
  sourceLanguage: string,
  targetLanguage: string
) {
  // 1. Translate query to English for search
  let searchQuery = query;
  if (sourceLanguage !== 'en') {
    const translation = await translateOnDevice(query, {
      targetLanguage: 'en',
      sourceLanguage,
    });
    searchQuery = translation.translated;
  }

  // 2. Search offline documents
  const offlineResults = await semanticSearch(searchQuery, {
    limit: 5,
    minSimilarity: 0.6,
  });

  // 3. Build context
  const context = offlineResults.documents
    .map(doc => `${doc.document.title}\n\n${doc.document.content}`)
    .join('\n\n---\n\n');

  // 4. Summarize using on-device AI
  const summary = await summarizeWithFallbacks(context, {
    maxLength: 300,
    language: targetLanguage,
    preferOnDevice: true,
  });

  // 5. Translate summary if needed
  let finalSummary = summary.summary;
  if (targetLanguage !== 'en' && summary.method !== 'fallback') {
    const translated = await translateOnDevice(summary.summary, {
      targetLanguage,
      sourceLanguage: 'en',
    });
    finalSummary = translated.translated;
  }

  return {
    query: searchQuery,
    summary: finalSummary,
    documents: offlineResults.documents,
    sourceLanguage,
    targetLanguage,
    method: summary.method,
  };
}

/**
 * Example 4: Real-time Memory Monitoring
 * Shows how to monitor and react to memory usage
 */
import { getMemoryProfiler } from '../src/lib/redix-mode/memory-profiler';
import { getRedixOptimizer } from '../src/lib/redix-mode/advanced-optimizer';

export function setupMemoryMonitoring() {
  const profiler = getMemoryProfiler({
    warning: 350,
    critical: 500,
    target: 250,
  });

  const optimizer = getRedixOptimizer();

  // Warning handler
  profiler.onWarning((snapshot) => {
    const memoryMB = snapshot.total / (1024 * 1024);
    console.warn(`[Memory] Warning: ${memoryMB.toFixed(0)} MB`);
    
    // Start cleanup
    optimizer.evictInactiveTabs();
    optimizer.clearExcessCache();
  });

  // Critical handler
  profiler.onCritical((snapshot) => {
    const memoryMB = snapshot.total / (1024 * 1024);
    console.error(`[Memory] Critical: ${memoryMB.toFixed(0)} MB`);
    
    // Aggressive cleanup
    optimizer.performAggressiveCleanup();
    
    // Unload AI model if loaded
    unloadModel().catch(console.error);
  });

  // Start monitoring
  profiler.startMonitoring(5000); // Every 5 seconds

  // Log stats periodically
  setInterval(() => {
    const stats = {
      current: profiler.getCurrentMemoryMB(),
      average: profiler.getAverageMemoryMB(),
      peak: profiler.getPeakMemoryMB(),
      trend: profiler.getMemoryTrend(),
    };
    console.log('[Memory] Stats:', stats);
  }, 30000); // Every 30 seconds

  return {
    stop: () => profiler.stopMonitoring(),
    getStats: () => ({
      current: profiler.getCurrentMemoryMB(),
      average: profiler.getAverageMemoryMB(),
      peak: profiler.getPeakMemoryMB(),
      trend: profiler.getMemoryTrend(),
    }),
  };
}

/**
 * Example 5: Complete Research Pipeline
 * End-to-end workflow with all features
 */
export async function completeResearchPipeline(query: string) {
  // Initialize monitoring
  initializeRedixMode();
  const monitoring = setupMemoryMonitoring();

  try {
    // Step 1: Check memory and adjust
    const stats = getRedixStats();
    if (stats && stats.memoryMB > 400) {
      console.log('[Pipeline] High memory, cleaning up...');
      await unloadModel();
    }

    // Step 2: Try offline semantic search
    let results;
    try {
      const offlineResults = await semanticSearch(query, {
        limit: 5,
        minSimilarity: 0.6,
        useHybrid: true,
      });

      if (offlineResults.documents.length >= 3) {
        // Enough offline results
        results = {
          source: 'offline',
          documents: offlineResults.documents,
        };
      }
    } catch (error) {
      console.warn('[Pipeline] Offline search failed:', error);
    }

    // Step 3: Fallback to web research if needed
    if (!results) {
      results = await executeEnhancedResearch(query, {
        useHybridSearch: true,
        useSemanticSearch: true,
        includePlanning: true,
        maxRetries: 2,
      });
    }

    // Step 4: Summarize results
    const context = results.documents
      ?.map((doc: any) => doc.document?.content || doc.content)
      .join('\n\n') || '';

    if (context) {
      const summary = await summarizeWithFallbacks(context, {
        maxLength: 300,
        preferOnDevice: true,
      });

      return {
        ...results,
        summary: summary.summary,
        summaryMethod: summary.method,
        memoryStats: monitoring.getStats(),
      };
    }

    return results;
  } catch (error) {
    console.error('[Pipeline] Research failed:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      memoryStats: monitoring.getStats(),
    };
  } finally {
    monitoring.stop();
  }
}

/**
 * Example 6: Batch Processing with Memory Management
 * Process multiple queries while managing memory
 */
export async function batchResearch(queries: string[]) {
  initializeRedixMode();
  const optimizer = getRedixOptimizer();

  const results = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    // Check memory before each query
    const stats = getRedixStats();
    if (stats && stats.memoryMB > 400) {
      console.log(`[Batch] Cleaning up before query ${i + 1}/${queries.length}`);
      await optimizer.performAggressiveCleanup();
      await unloadModel();
    }

    // Execute research
    try {
      const result = await executeEnhancedResearch(query, {
        useHybridSearch: true,
        preferOnDevice: true,
      });
      results.push({ query, result, success: true });
    } catch (error) {
      results.push({
        query,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }

    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}


