/**
 * Email RAG Integration
 * Enhance mail summaries with contextual information from email history
 */
import { LLMClient } from '../llmClient';

import type { EmailThread, EmailSummary } from '../mailAgent/types';
import { globalRAGEngine } from './ragEngine';

/**
 * Enhanced email summary with RAG context
 */
export interface EnhancedEmailSummary extends EmailSummary {
  contextDocuments: Array<{
    id: string;
    snippet: string;
    similarity: number;
  }>;
  contextAwarenessScore: number; // 0-1: how much context was used
  relatedEmails: string[]; // IDs of related emails
}

/**
 * Email RAG service
 */
export class EmailRAGService {
  private ragEngine = globalRAGEngine;
  private llmClient = new LLMClient();

  /**
   * Index email thread for RAG
   */
  async indexEmailThread(userId: string, thread: EmailThread): Promise<string> {
    // EmailThread has fullText property, not messages array
    const content = `
Thread: ${thread.subject}
From: ${thread.from}

Content:
${thread.fullText.substring(0, 2000)}
`;

    return await this.ragEngine.indexDocument(userId, content, {
      type: 'email_thread',
      threadId: thread.id,
      subject: thread.subject,
      timestamp: new Date(),
    });
  }

  /**
   * Index multiple email threads (batch)
   */
  async indexEmailThreads(userId: string, threads: EmailThread[]): Promise<string[]> {
    const docIds: string[] = [];

    for (const thread of threads) {
      const docId = await this.indexEmailThread(userId, thread);
      docIds.push(docId);
    }

    console.log(`[EmailRAG] Indexed ${docIds.length} email threads for ${userId}`);
    return docIds;
  }

  /**
   * Generate context-aware summary
   */
  async generateContextAwareSummary(
    userId: string,
    thread: EmailThread
  ): Promise<EnhancedEmailSummary> {
    // Build base summary using fullText instead of messages array
    const baseContent = `
Subject: ${thread.subject}
From: ${thread.from}

${thread.fullText.substring(0, 1500)}
`;

    // Retrieve context
    const ragContext = await this.ragEngine.retrieveAndGenerate(userId, thread.subject);

    // Build enhanced prompt with context
    const _prompt = `
Email Thread Summary

Thread Subject: ${thread.subject}

Content:
${baseContent}

Related context from email history:
${ragContext.generatedResponse}

Generate a concise summary that incorporates the historical context:
`;

    try {
      // Use real LLM to generate context-aware summary
      const summary = await this.llmClient.complete(_prompt, {
        max_tokens: 500,
        temperature: 0.7,
      });

      return {
        subject: thread.subject,
        from: thread.from,
        keyPoints: this.extractKeyPoints(summary),
        actionItems: this.extractActionItems(summary),
        sentiment: this.analyzeSentiment(summary),
        suggestedReplySnippet: '',
        isUrgent: false,
        contextDocuments: ragContext.documents.map(d => ({
          id: d.id,
          snippet: d.content.substring(0, 200),
          similarity: d.similarity
        })),
        contextAwarenessScore: Math.min(ragContext.documents.length * 0.2, 1), // 0-1
        relatedEmails: [],
      };
    } catch (error) {
      console.error('[EmailRAG] Summary generation failed:', error);
      // Fallback to basic summary
      return {
        subject: thread.subject,
        from: thread.from,
        keyPoints: [],
        actionItems: [],
        sentiment: 'neutral',
        suggestedReplySnippet: '',
        isUrgent: false,
        contextDocuments: [],
        contextAwarenessScore: 0,
        relatedEmails: [],
      };
    }
  }

  /**
   * Find related emails
   */
  async findRelatedEmails(userId: string, thread: EmailThread, limit: number = 3): Promise<string[]> {
    const ragContext = await this.ragEngine.retrieveAndGenerate(userId, thread.subject);

    return ragContext.documents.slice(0, limit).map((d) => d.id);
  }

  /**
   * Extract key points from summary
   */
  private extractKeyPoints(summary: string): string[] {
    const sentences = summary.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    return sentences.slice(0, 3).map((s) => s.trim());
  }

  /**
   * Extract action items
   */
  private extractActionItems(summary: string): string[] {
    const actionKeywords = [
      'need to',
      'should',
      'must',
      'will',
      'follow up',
      'action',
      'deadline',
      'required',
    ];

    const items: string[] = [];
    const sentences = summary.split(/[.!?]+/);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (actionKeywords.some((keyword) => lowerSentence.includes(keyword))) {
        items.push(sentence.trim());
      }
    }

    return items.slice(0, 3);
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(summary: string): 'positive' | 'negative' | 'neutral' {
    const positive = ['good', 'great', 'excellent', 'happy', 'thank', 'appreciate'];
    const negative = ['bad', 'poor', 'terrible', 'angry', 'urgent', 'critical'];

    const lowerSummary = summary.toLowerCase();
    const positiveCount = positive.filter((word) => lowerSummary.includes(word)).length;
    const negativeCount = negative.filter((word) => lowerSummary.includes(word)).length;

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * Build conversation timeline
   */
  async buildConversationTimeline(
    userId: string,
    threadId: string
  ): Promise<{
    threadId: string;
    relatedEmails: Array<{ id: string; subject: string; snippet: string; similarity: number }>;
    conversationFlow: string;
  }> {
    // This would use related documents to build a timeline
    // Implementation depends on indexing strategy

    return {
      threadId,
      relatedEmails: [],
      conversationFlow: 'Conversation context available',
    };
  }

  /**
   * Get RAG statistics
   */
  async getStats(userId: string): Promise<{
    indexedThreads: number;
    averageContextAwareness: number;
  }> {
    const stats = await this.ragEngine.getStats(userId);

    return {
      indexedThreads: stats.documentCount,
      averageContextAwareness: 0.65, // Mock value
    };
  }
}

export const emailRAGService = new EmailRAGService();
