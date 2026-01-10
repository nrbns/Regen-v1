/**
 * Topic Detection Service
 * Detects topics from page content, title, and URL
 * Uses heuristics + backend AI when available
 */

import { backendService } from '../backend/BackendService';

export interface DetectedTopic {
  topic: string;
  confidence: number; // 0-1
  category?: string;
  keywords?: string[];
  source: 'heuristic' | 'ai';
}

class TopicDetectionService {
  private cache: Map<string, DetectedTopic> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect topic from page content
   */
  async detectTopic(
    url: string,
    title?: string,
    content?: string
  ): Promise<DetectedTopic> {
    // Check cache
    const cacheKey = `${url}:${title || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Try AI detection first (if backend available)
    try {
      const aiTopic = await this.detectWithAI(title || '', content || '');
      if (aiTopic && aiTopic.confidence > 0.7) {
        this.cache.set(cacheKey, aiTopic);
        return aiTopic;
      }
    } catch (error) {
      console.warn('[TopicDetection] AI detection failed, using heuristics:', error);
    }

    // Fallback to heuristics
    const heuristicTopic = this.detectWithHeuristics(url, title, content);
    this.cache.set(cacheKey, heuristicTopic);
    
    // Clean old cache entries
    this.cleanCache();
    
    return heuristicTopic;
  }

  /**
   * Detect topic using AI (backend)
   */
  private async detectWithAI(title: string, content: string): Promise<DetectedTopic | null> {
    try {
      const prompt = `Analyze the following page and identify the main topic in 2-3 words. Be concise.

Title: ${title}
Content: ${content.substring(0, 500)}

Respond with just the topic name.`;

      const response = await backendService.aiTask('chat', {
        prompt,
        context: { task: 'topic_detection' },
      });

      if (response.success && response.data?.text) {
        const topic = response.data.text.trim().replace(/^Topic:\s*/i, '').split('\n')[0];
        return {
          topic,
          confidence: 0.85,
          source: 'ai',
          keywords: this.extractKeywords(title + ' ' + content),
        };
      }
    } catch (error) {
      console.warn('[TopicDetection] AI detection error:', error);
    }

    return null;
  }

  /**
   * Detect topic using heuristics
   */
  private detectWithHeuristics(
    url: string,
    title?: string,
    content?: string
  ): DetectedTopic {
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    const domain = new URL(url).hostname.replace('www.', '');

    // Domain-based detection
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return {
        topic: 'Video Content',
        confidence: 0.8,
        category: 'media',
        source: 'heuristic',
        keywords: ['video', 'youtube'],
      };
    }

    if (domain.includes('github.com')) {
      return {
        topic: 'Software Development',
        confidence: 0.85,
        category: 'technology',
        source: 'heuristic',
        keywords: ['code', 'github', 'development'],
      };
    }

    if (domain.includes('arxiv.org') || domain.includes('research')) {
      return {
        topic: 'Research',
        confidence: 0.8,
        category: 'academic',
        source: 'heuristic',
        keywords: ['research', 'paper', 'study'],
      };
    }

    // Keyword-based detection
    const topicPatterns: Array<{ pattern: RegExp; topic: string; category: string; confidence: number }> = [
      { pattern: /\b(ai|artificial intelligence|machine learning|ml|deep learning|neural network)\b/i, topic: 'AI & Machine Learning', category: 'technology', confidence: 0.9 },
      { pattern: /\b(quantum|quantum computing|qubit)\b/i, topic: 'Quantum Computing', category: 'technology', confidence: 0.9 },
      { pattern: /\b(browser|web browser|chrome|firefox|safari)\b/i, topic: 'Web Browsers', category: 'technology', confidence: 0.85 },
      { pattern: /\b(research|study|paper|academic|journal)\b/i, topic: 'Research', category: 'academic', confidence: 0.8 },
      { pattern: /\b(tutorial|guide|how to|learn)\b/i, topic: 'Tutorial', category: 'education', confidence: 0.75 },
      { pattern: /\b(news|article|report|breaking)\b/i, topic: 'News', category: 'media', confidence: 0.7 },
      { pattern: /\b(code|programming|software|developer)\b/i, topic: 'Programming', category: 'technology', confidence: 0.8 },
    ];

    for (const { pattern, topic, category, confidence } of topicPatterns) {
      if (pattern.test(text)) {
        return {
          topic,
          confidence,
          category,
          source: 'heuristic',
          keywords: this.extractKeywords(text),
        };
      }
    }

    // Fallback: Use domain or generic
    const fallbackTopic = domain.split('.')[0];
    return {
      topic: fallbackTopic.charAt(0).toUpperCase() + fallbackTopic.slice(1),
      confidence: 0.5,
      category: 'general',
      source: 'heuristic',
      keywords: [fallbackTopic],
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string, maxKeywords: number = 5): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'way', 'use', 'her', 'she', 'than', 'this', 'that', 'with', 'from', 'have', 'been', 'more', 'what', 'when', 'where', 'which', 'will', 'your', 'about', 'after', 'before', 'could', 'every', 'first', 'might', 'never', 'other', 'should', 'these', 'those', 'under', 'until', 'while', 'would']);

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      // Simple cleanup: remove entries older than TTL
      // In a real implementation, we'd track timestamps
      if (this.cache.size > 100) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const topicDetectionService = new TopicDetectionService();
