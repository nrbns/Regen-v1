/**
 * Zero-Prompt Prediction Service - v0.4 Week 1
 * Preemptive agent suggestions based on context (tab content, mode, history)
 *
 * Enables: "Hey Regen" wake word → predict likely actions before user speaks
 */

import { aiEngine } from '../core/ai';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';

export interface PredictedAction {
  intent: 'research' | 'trade' | 'scrape' | 'summarize' | 'navigate';
  prompt: string;
  confidence: number;
  context: string;
}

const PREDICTION_CACHE_KEY = 'regen:zero_prompt_cache';
const PREDICTION_TTL = 30000; // 30 seconds

interface CachedPrediction {
  predictions: PredictedAction[];
  timestamp: number;
  contextHash: string;
}

/**
 * Generate zero-prompt predictions based on current context
 *
 * Context includes:
 * - Current mode (trade/research/browse)
 * - Active tab URL/title
 * - Recent actions
 * - Page content (if available)
 */
export async function predictZeroPromptActions(
  maxSuggestions: number = 3
): Promise<PredictedAction[]> {
  const context = gatherContext();
  const contextHash = hashContext(context);

  // Check cache
  const cached = getCachedPredictions(contextHash);
  if (cached) {
    return cached.slice(0, maxSuggestions);
  }

  try {
    // Generate predictions using AI (lightweight, fast model)
    const prompt = buildPredictionPrompt(context);
    const result = await aiEngine.runTask({
      kind: 'agent',
      prompt,
      llm: {
        temperature: 0.3, // Lower temp for more focused predictions
        maxTokens: 300,
      },
    });

    // Parse AI response into structured predictions
    const predictions = parsePredictions(result.text, context);

    // Cache results
    cachePredictions(contextHash, predictions);

    return predictions.slice(0, maxSuggestions);
  } catch (error) {
    console.warn('[ZeroPrompt] Prediction failed, using fallback:', error);
    return generateFallbackPredictions(context).slice(0, maxSuggestions);
  }
}

/**
 * Gather current context for prediction
 */
function gatherContext(): {
  mode: string;
  activeTab?: { url: string; title: string };
  recentActions: string[];
} {
  const appState = useAppStore.getState();
  const tabsState = useTabsStore.getState();
  const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

  // Get recent actions from localStorage (last 5)
  const recentActions = JSON.parse(localStorage.getItem('regen:recent_actions') || '[]').slice(
    -5
  ) as string[];

  return {
    mode: appState.mode || 'browse',
    activeTab: activeTab
      ? {
          url: activeTab.url || '',
          title: activeTab.title || '',
        }
      : undefined,
    recentActions,
  };
}

/**
 * Build prediction prompt for AI
 */
function buildPredictionPrompt(context: ReturnType<typeof gatherContext>): string {
  const parts = ['Predict 3 most likely user actions based on context:', `Mode: ${context.mode}`];

  if (context.activeTab) {
    parts.push(`Current page: ${context.activeTab.title} (${context.activeTab.url})`);
  }

  if (context.recentActions.length > 0) {
    parts.push(`Recent actions: ${context.recentActions.join(', ')}`);
  }

  parts.push(
    'Return JSON array: [{"intent": "research|trade|scrape|summarize|navigate", "prompt": "suggested command", "confidence": 0.0-1.0, "context": "why"}]'
  );

  return parts.join('\n');
}

/**
 * Parse AI response into structured predictions
 */
function parsePredictions(
  aiText: string,
  context: ReturnType<typeof gatherContext>
): PredictedAction[] {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as PredictedAction[];
      return parsed.filter(p => p.intent && p.prompt);
    }
  } catch (error) {
    console.warn('[ZeroPrompt] Failed to parse AI predictions:', error);
  }

  // Fallback to rule-based predictions
  return generateFallbackPredictions(context);
}

/**
 * Generate fallback predictions using heuristics
 */
function generateFallbackPredictions(context: ReturnType<typeof gatherContext>): PredictedAction[] {
  const predictions: PredictedAction[] = [];

  if (context.mode === 'trade') {
    predictions.push({
      intent: 'trade',
      prompt: 'Show NIFTY chart',
      confidence: 0.8,
      context: 'Trade mode active',
    });
    predictions.push({
      intent: 'research',
      prompt: `Research ${context.activeTab?.title || 'current symbol'}`,
      confidence: 0.6,
      context: 'Research before trading',
    });
  } else if (context.mode === 'research') {
    if (context.activeTab?.url) {
      predictions.push({
        intent: 'scrape',
        prompt: 'Scrape current page',
        confidence: 0.9,
        context: 'Research mode with active page',
      });
      predictions.push({
        intent: 'summarize',
        prompt: 'Summarize this page',
        confidence: 0.7,
        context: 'Quick summary needed',
      });
    }
    predictions.push({
      intent: 'research',
      prompt: 'Research latest trends',
      confidence: 0.5,
      context: 'General research suggestion',
    });
  } else {
    // Browse mode
    if (context.activeTab?.url && context.activeTab.url.startsWith('http')) {
      predictions.push({
        intent: 'summarize',
        prompt: 'Summarize this page',
        confidence: 0.8,
        context: 'Active web page',
      });
      predictions.push({
        intent: 'scrape',
        prompt: 'Extract key points',
        confidence: 0.6,
        context: 'Content extraction',
      });
    }
  }

  return predictions;
}

/**
 * Hash context for cache key
 */
function hashContext(context: ReturnType<typeof gatherContext>): string {
  const str = JSON.stringify({
    mode: context.mode,
    url: context.activeTab?.url,
    title: context.activeTab?.title,
  });
  // Simple hash (FNV-1a inspired)
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash.toString(36);
}

/**
 * Get cached predictions if still valid
 */
function getCachedPredictions(contextHash: string): PredictedAction[] | null {
  try {
    const cached = localStorage.getItem(PREDICTION_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedPrediction;
    const age = Date.now() - parsed.timestamp;

    if (age < PREDICTION_TTL && parsed.contextHash === contextHash) {
      return parsed.predictions;
    }
  } catch (error) {
    console.warn('[ZeroPrompt] Cache read failed:', error);
  }

  return null;
}

/**
 * Cache predictions
 */
function cachePredictions(contextHash: string, predictions: PredictedAction[]): void {
  try {
    const cached: CachedPrediction = {
      predictions,
      timestamp: Date.now(),
      contextHash,
    };
    localStorage.setItem(PREDICTION_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn('[ZeroPrompt] Cache write failed:', error);
  }
}

/**
 * Track user action for future predictions
 */
export function trackUserAction(action: string): void {
  try {
    const recent = JSON.parse(localStorage.getItem('regen:recent_actions') || '[]') as string[];
    recent.push(action);
    // Keep last 10
    const trimmed = recent.slice(-10);
    localStorage.setItem('regen:recent_actions', JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[ZeroPrompt] Failed to track action:', error);
  }
}
