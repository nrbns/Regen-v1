/**
 * Suggestion Engine - BATTLE 2
 * 
 * Connects PatternDetector to AI suggestions.
 * AI appears only on pattern detection, one suggestion at a time.
 */

import { patternDetector, type DetectedPattern } from '../pattern/PatternDetector';
import { eventBus } from '../state/eventBus';
import { aiEngine } from '../ai/engine';

/**
 * Suggestion Engine
 * BATTLE 2: AI appears only on pattern detection
 */
class SuggestionEngine {
  private activeSuggestion: DetectedPattern | null = null;
  private listeners: Set<(suggestion: DetectedPattern | null) => void> = new Set();

  constructor() {
    // Listen for pattern detection
    eventBus.on('pattern:detected', (pattern: DetectedPattern) => {
      this.handlePatternDetected(pattern);
    });

    // Listen for pattern cleared
    patternDetector.onPatternChange((pattern) => {
      if (!pattern) {
        this.clearSuggestion();
      }
    });
  }

  /**
   * Handle pattern detection
   * BATTLE 2: Generate AI suggestion only when pattern detected
   */
  private async handlePatternDetected(pattern: DetectedPattern): Promise<void> {
    // Only one suggestion at a time
    if (this.activeSuggestion) {
      return;
    }

    this.activeSuggestion = pattern;

    // Generate AI suggestion based on pattern (optional, can be skipped for speed)
    // For now, we use pattern-based heuristics (cheap, no AI)
    const suggestion = this.generateSuggestionFromPattern(pattern);

    // Emit suggestion to UI
    eventBus.emit('ai:suggestion:generated', {
      pattern,
      action: suggestion,
    });

    this.notifyListeners(pattern);
  }

  /**
   * Generate suggestion from pattern (cheap, no AI)
   * BATTLE 2: Lightweight heuristics first, AI only if needed
   */
  private generateSuggestionFromPattern(pattern: DetectedPattern): string {
    switch (pattern.type) {
      case 'research_paper':
        return 'Summarize this research paper';
      case 'long_article':
        return 'Extract key points from this article';
      case 'document_editor':
        return 'Review and improve this document';
      case 'code_repository':
        return 'Explain this codebase';
      case 'video_content':
        return 'Summarize this video';
      case 'shopping_page':
        return 'Compare products on this page';
      case 'social_feed':
        return 'Analyze trends in this feed';
      case 'search_results':
        return 'Refine this search';
      default:
        return 'Analyze this content';
    }
  }

  /**
   * Clear current suggestion
   * BATTLE 2: Ignore = respected
   */
  clearSuggestion(): void {
    this.activeSuggestion = null;
    this.notifyListeners(null);
  }

  /**
   * Get active suggestion
   */
  getActiveSuggestion(): DetectedPattern | null {
    return this.activeSuggestion;
  }

  /**
   * Subscribe to suggestion changes
   * BATTLE 2: One suggestion at a time
   */
  onSuggestionChange(callback: (suggestion: DetectedPattern | null) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current suggestion
    callback(this.activeSuggestion);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(suggestion: DetectedPattern | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(suggestion);
      } catch (error) {
        console.error('[SuggestionEngine] Error in listener:', error);
      }
    });
  }
}

// Singleton instance
export const suggestionEngine = new SuggestionEngine();
