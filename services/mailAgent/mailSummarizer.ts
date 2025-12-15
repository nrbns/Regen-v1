/**
 * Mail Summarizer
 * Uses LLM to summarize emails with action items and sentiment
 * Optionally uses RAG for context-aware summaries
 */

import type { EmailThread, EmailSummary } from './types';
import type { EnhancedEmailSummary } from '../rag/emailRAG';
import { emailRAGService } from '../rag/emailRAG';

/**
 * LLM Provider interface
 */
interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

/**
 * Anthropic Claude provider (default)
 */
class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-haiku-4.5') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.content?.[0]?.text || '';
  }
}

/**
 * OpenAI GPT provider
 */
class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * Ollama local provider (free, offline)
 */
class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.response || '';
  }
}

/**
 * MailSummarizer: main class
 */
export class MailSummarizer {
  private llm: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llm = llmProvider;
  }

  /**
   * Summarize an email thread (basic)
   */
  async summarize(thread: EmailThread): Promise<EmailSummary> {
    const prompt = this.buildSummaryPrompt(thread);

    let rawResponse: string;
    try {
      rawResponse = await this.llm.complete(prompt);
    } catch (error) {
      console.error(`[MailSummarizer] LLM call failed: ${error}`);
      // Fallback: basic parsing
      return this.fallbackSummary(thread);
    }

    return this.parseResponse(thread, rawResponse);
  }

  /**
   * Summarize with RAG context (context-aware)
   */
  async summarizeWithContext(userId: string, thread: EmailThread): Promise<EnhancedEmailSummary> {
    try {
      return await emailRAGService.generateContextAwareSummary(userId, thread);
    } catch (error) {
      console.error(`[MailSummarizer] RAG summarization failed: ${error}`);
      // Fallback to basic summary
      const basicSummary = await this.summarize(thread);
      return {
        ...basicSummary,
        contextDocuments: [],
        contextAwarenessScore: 0,
        relatedEmails: [],
      };
    }
  }

  /**
   * Build the prompt for summarization
   */
  private buildSummaryPrompt(thread: EmailThread): string {
    return `Analyze this email thread and provide:
1. 3 key points (as bullet list)
2. Action items needed (as bullet list)
3. Sentiment (positive/neutral/negative)
4. A 1-2 sentence suggested reply (<=80 words)
5. Is this urgent? (yes/no)

Email:
From: ${thread.from}
Subject: ${thread.subject}
Date: ${thread.date}

${thread.fullText.substring(0, 2000)}

Format response as:
KEY POINTS:
- point 1
- point 2
- point 3

ACTION ITEMS:
- item 1
- item 2

SENTIMENT: [positive|neutral|negative]

SUGGESTED REPLY:
[suggested reply text]

URGENT: [yes|no]`;
  }

  /**
   * Parse LLM response into structured summary
   */
  private parseResponse(thread: EmailThread, response: string): EmailSummary {
    const sections: Record<string, string> = {};

    const lines = response.split('\n');
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('KEY POINTS:')) {
        currentSection = 'keyPoints';
        sections[currentSection] = '';
      } else if (line.startsWith('ACTION ITEMS:')) {
        currentSection = 'actionItems';
        sections[currentSection] = '';
      } else if (line.startsWith('SENTIMENT:')) {
        currentSection = 'sentiment';
        sections[currentSection] = line.replace('SENTIMENT:', '').trim();
      } else if (line.startsWith('SUGGESTED REPLY:')) {
        currentSection = 'suggestedReply';
        sections[currentSection] = '';
      } else if (line.startsWith('URGENT:')) {
        currentSection = 'urgent';
        sections[currentSection] = line.replace('URGENT:', '').trim();
      } else if (line.trim() && currentSection) {
        sections[currentSection] += (sections[currentSection] ? '\n' : '') + line.trim();
      }
    }

    const keyPoints = (sections['keyPoints'] || '')
      .split('\n')
      .filter(l => l.startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);

    const actionItems = (sections['actionItems'] || '')
      .split('\n')
      .filter(l => l.startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);

    const sentiment = (sections['sentiment'] || 'neutral').toLowerCase().includes('positive')
      ? 'positive'
      : (sections['sentiment'] || 'neutral').toLowerCase().includes('negative')
        ? 'negative'
        : 'neutral';

    const isUrgent = (sections['urgent'] || 'no').toLowerCase().startsWith('y');

    return {
      subject: thread.subject,
      from: thread.from,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Thread summarized from email content.'],
      actionItems: actionItems.length > 0 ? actionItems : [],
      sentiment,
      suggestedReplySnippet: sections['suggestedReply'] || `Thanks for reaching out about ${thread.subject}. Will get back to you shortly.`,
      isUrgent,
    };
  }

  /**
   * Fallback summary (no LLM)
   */
  private fallbackSummary(thread: EmailThread): EmailSummary {
    return {
      subject: thread.subject,
      from: thread.from,
      keyPoints: [thread.snippet.substring(0, 100)],
      actionItems: [],
      sentiment: 'neutral',
      suggestedReplySnippet: `Thanks for your email. Will review and respond shortly.`,
      isUrgent: thread.subject.toLowerCase().includes('urgent'),
    };
  }
}

/**
 * Factory to create summarizer from env
 */
export function createMailSummarizer(): MailSummarizer {
  const provider = process.env.LLM_PROVIDER || 'anthropic';

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5';
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for anthropic provider');
    }
    return new MailSummarizer(new AnthropicProvider(apiKey, model));
  } else if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for openai provider');
    }
    return new MailSummarizer(new OpenAIProvider(apiKey, model));
  } else if (provider === 'ollama') {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama2';
    return new MailSummarizer(new OllamaProvider(baseUrl, model));
  }

  throw new Error(`Unknown LLM provider: ${provider}`);
}

// Export providers for testing
export { AnthropicProvider, OpenAIProvider, OllamaProvider };
