/**
 * L1 - Browser Intelligence
 *
 * Light AI features loaded on-demand:
 * - Command bar AI
 * - Page summarization
 * - Explain page
 * - Translate
 * - Highlight / annotate
 * - Small offline models
 *
 * All features use Tauri invoke() - no Socket.IO, no Node backend
 */

import { ipc } from '../../lib/ipc-typed';

let l1Initialized = false;

/**
 * Initialize L1 intelligence features
 */
export async function initializeL1Intelligence(): Promise<void> {
  if (l1Initialized) {
    return;
  }

  console.log('[L1] Initializing browser intelligence features');

  // L1 features are loaded on-demand via Tauri invoke()
  // No heavy initialization needed - just mark as ready
  l1Initialized = true;
  console.log('[L1] Ready');
}

/**
 * Check if L1 is initialized
 */
export function isL1Initialized(): boolean {
  return l1Initialized;
}

/**
 * Command bar AI - lightweight AI assistance
 */
export async function commandBarAI(query: string): Promise<string> {
  if (!l1Initialized) {
    await initializeL1Intelligence();
  }

  try {
    // Use Tauri invoke for lightweight AI calls
    const result = await ipc.ai?.query?.({
      query,
      context: 'command-bar',
      model: 'small', // Use small/lightweight model
    });

    return result?.response || 'AI service unavailable';
  } catch (error) {
    console.error('[L1] Command bar AI error:', error);
    throw error;
  }
}

/**
 * Page summarization
 */
export async function summarizePage(url: string): Promise<string> {
  if (!l1Initialized) {
    await initializeL1Intelligence();
  }

  try {
    const result = await ipc.ai?.summarize?.({
      url,
      maxLength: 500,
    });

    return result?.summary || 'Summary unavailable';
  } catch (error) {
    console.error('[L1] Page summarization error:', error);
    throw error;
  }
}

/**
 * Explain page content
 */
export async function explainPage(url: string, question?: string): Promise<string> {
  if (!l1Initialized) {
    await initializeL1Intelligence();
  }

  try {
    const result = await ipc.ai?.explain?.({
      url,
      question: question || 'Explain this page',
    });

    return result?.explanation || 'Explanation unavailable';
  } catch (error) {
    console.error('[L1] Page explanation error:', error);
    throw error;
  }
}

/**
 * Translate text
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!l1Initialized) {
    await initializeL1Intelligence();
  }

  try {
    const result = await ipc.ai?.translate?.({
      text,
      targetLanguage,
    });

    return result?.translation || text;
  } catch (error) {
    console.error('[L1] Translation error:', error);
    throw error;
  }
}

/**
 * Cleanup L1 resources (when exiting L1 layer)
 */
export function cleanupL1(): void {
  l1Initialized = false;
  console.log('[L1] Cleaned up');
}
