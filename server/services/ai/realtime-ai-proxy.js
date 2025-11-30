/**
 * Real-Time AI Proxy - Production Ready
 * Handles all AI requests with real-time streaming, caching, and fallbacks
 */

import axios from 'axios';
import { EventEmitter } from 'events';

class RealtimeAIProxy extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.activeStreams = new Map();
    this.config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      },
      ollama: {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2',
      },
      provider: process.env.AI_PROVIDER || 'openai', // openai, anthropic, ollama
    };
  }

  /**
   * Real-time research summarization with streaming
   */
  async streamResearchSummary(query, sources, options = {}) {
    const cacheKey = `research:${query}:${JSON.stringify(sources).slice(0, 100)}`;
    
    // Check cache
    if (this.cache.has(cacheKey) && !options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      return this._streamFromCache(cached);
    }

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      if (this.config.provider === 'ollama') {
        return this._streamOllamaResearch(query, sources, streamId);
      } else if (this.config.provider === 'anthropic') {
        return this._streamAnthropicResearch(query, sources, streamId);
      } else {
        return this._streamOpenAIResearch(query, sources, streamId);
      }
    } catch (error) {
      console.error('[AI Proxy] Stream error:', error);
      // Fallback to Ollama if available
      if (this.config.provider !== 'ollama') {
        try {
          return this._streamOllamaResearch(query, sources, streamId);
        } catch (fallbackError) {
          throw new Error(`AI service unavailable: ${error.message}`);
        }
      }
      throw error;
    }
  }

  async _streamOpenAIResearch(query, sources, streamId) {
    const messages = [
      {
        role: 'system',
        content: `You are a research assistant. Provide comprehensive, accurate summaries with citations. Always cite sources using [1], [2], etc.`,
      },
      {
        role: 'user',
        content: `Query: ${query}\n\nSources:\n${sources.map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.snippet || s.content || ''}`).join('\n\n')}\n\nProvide a detailed summary with citations.`,
      },
    ];

    const response = await axios.post(
      `${this.config.openai.baseURL}/chat/completions`,
      {
        model: this.config.openai.model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    return this._handleStreamResponse(response.data, streamId, 'openai');
  }

  async _streamAnthropicResearch(query, sources, streamId) {
    const messages = [
      {
        role: 'user',
        content: `Query: ${query}\n\nSources:\n${sources.map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.snippet || s.content || ''}`).join('\n\n')}\n\nProvide a detailed summary with citations.`,
      },
    ];

    const response = await axios.post(
      `${this.config.anthropic.baseURL}/messages`,
      {
        model: this.config.anthropic.model,
        messages,
        max_tokens: 2000,
        stream: true,
      },
      {
        headers: {
          'x-api-key': this.config.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    return this._handleStreamResponse(response.data, streamId, 'anthropic');
  }

  async _streamOllamaResearch(query, sources, streamId) {
    const prompt = `Query: ${query}\n\nSources:\n${sources.map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.snippet || s.content || ''}`).join('\n\n')}\n\nProvide a detailed summary with citations.`;

    const response = await axios.post(
      `${this.config.ollama.baseURL}/api/generate`,
      {
        model: this.config.ollama.model,
        prompt,
        stream: true,
      },
      {
        responseType: 'stream',
      }
    );

    return this._handleStreamResponse(response.data, streamId, 'ollama');
  }

  _handleStreamResponse(stream, streamId, provider) {
    let fullText = '';
    let buffer = '';

    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          if (provider === 'openai') {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                this.emit('done', { streamId, text: fullText });
                return;
              }
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                this.emit('chunk', { streamId, text: delta, fullText });
              }
            }
          } else if (provider === 'anthropic') {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                if (delta) {
                  fullText += delta;
                  this.emit('chunk', { streamId, text: delta, fullText });
                }
              } else if (parsed.type === 'message_stop') {
                this.emit('done', { streamId, text: fullText });
                return;
              }
            }
          } else if (provider === 'ollama') {
            const parsed = JSON.parse(line);
            const delta = parsed.response || '';
            if (delta) {
              fullText += delta;
              this.emit('chunk', { streamId, text: delta, fullText });
            }
            if (parsed.done) {
              this.emit('done', { streamId, text: fullText });
              return;
            }
          }
        } catch (error) {
          // Skip malformed JSON
        }
      }
    });

    stream.on('end', () => {
      this.emit('done', { streamId, text: fullText });
    });

    stream.on('error', (error) => {
      this.emit('error', { streamId, error });
    });

    this.activeStreams.set(streamId, stream);
    return streamId;
  }

  /**
   * Real-time page summarization
   */
  async summarizePage(url, content, options = {}) {
    const { length = 'medium' } = options; // short, medium, long
    const cacheKey = `summary:${url}:${length}`;
    
    if (this.cache.has(cacheKey) && !options.forceRefresh) {
      return this.cache.get(cacheKey);
    }

    const prompt = `Summarize this webpage content in ${length} format (${length === 'short' ? '2-3 sentences' : length === 'medium' ? '1 paragraph' : '2-3 paragraphs'}):\n\nURL: ${url}\n\nContent:\n${content.slice(0, 8000)}`;

    try {
      const summary = await this._callAI(prompt, {
        max_tokens: length === 'short' ? 150 : length === 'medium' ? 300 : 600,
      });
      
      const keywords = await this._extractKeywords(content);
      
      const result = {
        summary,
        keywords,
        url,
        length,
        timestamp: Date.now(),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[AI Proxy] Summarization error:', error);
      throw error;
    }
  }

  /**
   * Extract keywords from content
   */
  async _extractKeywords(content) {
    const prompt = `Extract the top 10 most important keywords from this content. Return as a JSON array of strings:\n\n${content.slice(0, 4000)}`;
    
    try {
      const response = await this._callAI(prompt, {
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });
      
      const parsed = JSON.parse(response);
      return parsed.keywords || [];
    } catch {
      // Fallback: simple keyword extraction
      const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
      const freq = {};
      words.forEach(w => freq[w] = (freq[w] || 0) + 1);
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
    }
  }

  /**
   * Generate agent suggestions (3 next actions)
   */
  async suggestNextActions(context) {
    const { currentUrl, query, sessionHistory, openTabs } = context;
    
    const prompt = `Based on this research context, suggest 3 specific next actions:\n\nCurrent URL: ${currentUrl}\nQuery: ${query}\nRecent tabs: ${openTabs?.slice(0, 5).join(', ') || 'none'}\n\nSuggest 3 actionable next steps (e.g., "Open paper on X", "Set reminder for Y", "Search for Z"). Return as JSON: { actions: [{ type: string, label: string, command: string }] }`;

    try {
      const response = await this._callAI(prompt, {
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });
      
      const parsed = JSON.parse(response);
      return parsed.actions || [];
    } catch (error) {
      // Fallback suggestions
      return [
        { type: 'search', label: 'Search related topics', command: `search:${query} related` },
        { type: 'open', label: 'Open similar papers', command: `open:similar papers` },
        { type: 'reminder', label: 'Set research reminder', command: `reminder:review this later` },
      ];
    }
  }

  /**
   * Generic AI call
   */
  async _callAI(prompt, options = {}) {
    if (this.config.provider === 'ollama') {
      return this._callOllama(prompt, options);
    } else if (this.config.provider === 'anthropic') {
      return this._callAnthropic(prompt, options);
    } else {
      return this._callOpenAI(prompt, options);
    }
  }

  async _callOpenAI(prompt, options) {
    const response = await axios.post(
      `${this.config.openai.baseURL}/chat/completions`,
      {
        model: this.config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        ...options,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async _callAnthropic(prompt, options) {
    const response = await axios.post(
      `${this.config.anthropic.baseURL}/messages`,
      {
        model: this.config.anthropic.model,
        messages: [{ role: 'user', content: prompt }],
        ...options,
      },
      {
        headers: {
          'x-api-key': this.config.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.content[0].text;
  }

  async _callOllama(prompt, options) {
    const response = await axios.post(
      `${this.config.ollama.baseURL}/api/generate`,
      {
        model: this.config.ollama.model,
        prompt,
        stream: false,
        ...options,
      }
    );

    return response.data.response;
  }

  _streamFromCache(cached) {
    // Simulate streaming from cache
    const streamId = `cache_${Date.now()}`;
    let index = 0;
    const interval = setInterval(() => {
      if (index < cached.summary.length) {
        const chunk = cached.summary.slice(index, index + 10);
        this.emit('chunk', { streamId, text: chunk, fullText: cached.summary.slice(0, index + 10) });
        index += 10;
      } else {
        clearInterval(interval);
        this.emit('done', { streamId, text: cached.summary });
      }
    }, 50);
    return streamId;
  }

  cancelStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.destroy();
      this.activeStreams.delete(streamId);
    }
  }
}

export const aiProxy = new RealtimeAIProxy();

