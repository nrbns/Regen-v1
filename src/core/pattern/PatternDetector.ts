/**
 * Pattern Detection System - BATTLE 2
 * 
 * AI appears only on pattern detection, not prompts.
 * This is how Regen feels human, not robotic.
 * 
 * Requirements:
 * - Cheap (lightweight heuristics, no AI needed)
 * - Event-driven (no polling)
 * - One suggestion at a time
 * - Ignore = respected
 */

import { eventBus } from '../state/eventBus';

export type PatternType =
  | 'research_paper'      // PDF or academic paper detected
  | 'long_article'         // Long-form content (>2000 words)
  | 'shopping_page'        // E-commerce or product page
  | 'document_editor'      // Google Docs, Notion, etc.
  | 'code_repository'      // GitHub, GitLab, etc.
  | 'video_content'        // YouTube, Vimeo, etc.
  | 'social_feed'          // Twitter, Reddit, etc.
  | 'search_results';      // Search engine results

export interface DetectedPattern {
  type: PatternType;
  confidence: number; // 0-1
  context: {
    url: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };
  suggestion?: string; // Optional AI suggestion (only if pattern detected)
}

/**
 * Pattern Detector - Lightweight, event-driven pattern detection
 * BATTLE 2: AI appears only on pattern detection
 */
class PatternDetector {
  private activePattern: DetectedPattern | null = null;
  private listeners: Set<(pattern: DetectedPattern | null) => void> = new Set();
  private ignoredPatterns: Set<string> = new Set(); // Track ignored patterns

  constructor() {
    // Listen for navigation events
    eventBus.on('TAB_NAVIGATED', (url: string) => {
      this.detectPattern(url);
    });

    // Listen for page load events
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        this.detectPattern(window.location.href);
      }, { once: true });
    }
  }

  /**
   * Detect pattern from URL and page content
   * BATTLE 2: Cheap detection (no AI needed)
   */
  private async detectPattern(url: string): Promise<void> {
    // Clear previous pattern
    this.activePattern = null;
    this.notifyListeners(null);

    // Skip if URL is ignored
    if (this.ignoredPatterns.has(url)) {
      return;
    }

    // Lightweight heuristics (no AI, no heavy processing)
    const pattern = await this.detectPatternHeuristic(url);

    if (pattern && pattern.confidence > 0.6) {
      this.activePattern = pattern;
      this.notifyListeners(pattern);
      
      // Emit pattern detected event (AI can listen to this)
      eventBus.emit('pattern:detected', pattern);
    }
  }

  /**
   * Heuristic-based pattern detection (cheap, no AI)
   * BATTLE 2: Lightweight heuristics only
   */
  private async detectPatternHeuristic(url: string): Promise<DetectedPattern | null> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      // Research paper detection
      if (pathname.endsWith('.pdf') || hostname.includes('arxiv.org') || hostname.includes('researchgate.net')) {
        return {
          type: 'research_paper',
          confidence: 0.9,
          context: { url },
        };
      }

      // Document editor detection
      if (hostname.includes('docs.google.com') || 
          hostname.includes('notion.so') || 
          hostname.includes('obsidian.md')) {
        return {
          type: 'document_editor',
          confidence: 0.95,
          context: { url },
        };
      }

      // Code repository detection
      if (hostname.includes('github.com') || 
          hostname.includes('gitlab.com') || 
          hostname.includes('bitbucket.org')) {
        return {
          type: 'code_repository',
          confidence: 0.9,
          context: { url },
        };
      }

      // Video content detection
      if (hostname.includes('youtube.com') || 
          hostname.includes('vimeo.com') || 
          hostname.includes('twitch.tv')) {
        return {
          type: 'video_content',
          confidence: 0.9,
          context: { url },
        };
      }

      // Shopping page detection
      if (hostname.includes('amazon.com') || 
          hostname.includes('shopify.com') || 
          pathname.includes('/product/') || 
          pathname.includes('/shop/')) {
        return {
          type: 'shopping_page',
          confidence: 0.8,
          context: { url },
        };
      }

      // Social feed detection
      if (hostname.includes('twitter.com') || 
          hostname.includes('x.com') || 
          hostname.includes('reddit.com') || 
          hostname.includes('linkedin.com')) {
        return {
          type: 'social_feed',
          confidence: 0.85,
          context: { url },
        };
      }

      // Search results detection
      if (hostname.includes('google.com') && pathname.includes('/search')) {
        return {
          type: 'search_results',
          confidence: 0.9,
          context: { url },
        };
      }

      // Long article detection (requires DOM access, but still cheap)
      if (typeof document !== 'undefined') {
        const article = document.querySelector('article, main, [role="article"]');
        if (article) {
          const textLength = article.textContent?.length || 0;
          if (textLength > 2000) {
            return {
              type: 'long_article',
              confidence: 0.7,
              context: { url },
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('[PatternDetector] Error detecting pattern:', error);
      return null;
    }
  }

  /**
   * Get currently detected pattern
   */
  getActivePattern(): DetectedPattern | null {
    return this.activePattern;
  }

  /**
   * Subscribe to pattern changes
   * BATTLE 2: One suggestion at a time
   */
  onPatternChange(callback: (pattern: DetectedPattern | null) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current pattern
    callback(this.activePattern);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Ignore current pattern (user dismissed)
   * BATTLE 2: Ignore = respected
   */
  ignorePattern(url: string): void {
    this.ignoredPatterns.add(url);
    this.activePattern = null;
    this.notifyListeners(null);
    
    // Clear ignored pattern after 1 hour
    setTimeout(() => {
      this.ignoredPatterns.delete(url);
    }, 3600000);
  }

  /**
   * Notify all listeners of pattern change
   */
  private notifyListeners(pattern: DetectedPattern | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(pattern);
      } catch (error) {
        console.error('[PatternDetector] Error in listener:', error);
      }
    });
  }
}

// Singleton instance
export const patternDetector = new PatternDetector();
