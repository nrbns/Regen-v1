/**
 * Agent Controller - Real LLM Integration
 * Handles research agent requests and execution with real data
 */

import { aiProxy } from '../services/ai/realtime-ai-proxy.js';
import { researchSearch } from '../services/research/search.js';

/**
 * Research Agent Request Schema
 * @typedef {Object} ResearchAgentRequest
 * @property {string} query - The research query
 * @property {string} [url] - Optional URL to analyze
 * @property {string} [context] - Additional context
 * @property {string} [mode] - 'local' | 'remote' | 'hybrid'
 */

/**
 * Research Agent Response Schema
 * @typedef {Object} ResearchAgentResponsePreview
 * @property {string} agent_version - Version identifier
 * @property {Object} summary - Summary object
 * @property {string} summary.short - Short summary
 * @property {string[]} summary.bullets - Bullet points
 * @property {string[]} summary.keywords - Extracted keywords
 * @property {Array} actions - Suggested actions
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} explainability - Explanation text
 * @property {number} citations - Number of citations
 * @property {string} hallucination - 'low' | 'medium' | 'high'
 */

/**
 * POST /api/agent/research
 * Real research agent with LLM integration
 */
export async function researchAgent(req, reply) {
  try {
    const { query, url, context, mode = 'hybrid' } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return reply.code(400).send({
        error: 'Invalid query',
        message: 'Query must be at least 2 characters',
      });
    }

    // DEV mode: return mock if DEV=true
    if (
      process.env.DEV === 'true' &&
      !process.env.OPENAI_API_KEY &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      return reply.send({
        agent_version: 'dev-v1',
        summary: {
          short: `Mock summary for: ${query}`,
          bullets: [
            'This is a mock response for development',
            'Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env for real responses',
            'Or use Ollama locally (no API key needed)',
          ],
          keywords: ['mock', 'development', 'test'],
        },
        actions: [
          {
            id: 'act_open_1',
            type: 'open_tabs',
            label: 'Open ArXiv',
            payload: {
              tabs: [{ title: 'ArXiv', url: 'https://arxiv.org' }],
            },
          },
          {
            id: 'act_search_1',
            type: 'search',
            label: 'Search Google',
            payload: { query: query },
          },
        ],
        confidence: 0.9,
        explainability: 'dev mock response',
        citations: 0,
        hallucination: 'low',
      });
    }

    // Real implementation: Search + LLM analysis
    const startTime = Date.now();

    // 1. Search for sources
    let sources = [];
    try {
      const searchResults = await researchSearch({
        q: query,
        size: 5,
        language: 'en',
      });
      sources = searchResults.results || [];
    } catch (error) {
      console.warn('[Agent] Search failed, continuing without sources:', error.message);
    }

    // 2. Build prompt with sources
    const sourcesText = sources
      .map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.snippet || s.content || ''}`)
      .join('\n\n');

    const systemPrompt = `You are a research assistant. Provide comprehensive, accurate summaries with citations. Always cite sources using [1], [2], etc. Format your response as JSON with this structure:
{
  "summary": {
    "short": "Brief summary (1-2 sentences)",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"],
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "actions": [
    {
      "id": "act_1",
      "type": "open_tabs",
      "label": "Action label",
      "payload": {"tabs": [{"title": "Title", "url": "https://..."}]}
    }
  ],
  "confidence": 0.85,
  "explainability": "Brief explanation of reasoning",
  "hallucination": "low"
}`;

    const userPrompt = `Query: ${query}${url ? `\nURL to analyze: ${url}` : ''}${context ? `\nContext: ${context}` : ''}${sourcesText ? `\n\nSources:\n${sourcesText}` : ''}\n\nProvide a detailed research summary with suggested actions.`;

    // 3. Call LLM (with streaming support)
    let llmResponse;
    try {
      if (mode === 'local' || process.env.AI_PROVIDER === 'ollama') {
        // Use Ollama locally
        llmResponse = await callOllama(systemPrompt, userPrompt);
      } else {
        // Use OpenAI/Anthropic via AI proxy
        llmResponse = await aiProxy.streamResearchSummary(query, sources, {
          systemPrompt,
          userPrompt,
          forceRefresh: false,
        });
      }
    } catch (error) {
      console.error('[Agent] LLM call failed:', error);
      // Fallback to Ollama
      try {
        llmResponse = await callOllama(systemPrompt, userPrompt);
      } catch {
        return reply.code(500).send({
          error: 'LLM service unavailable',
          message: 'Both primary and fallback LLM services failed',
        });
      }
    }

    // 4. Parse LLM response (extract JSON)
    let parsedResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: construct response from text
        parsedResponse = {
          summary: {
            short: llmResponse.slice(0, 200),
            bullets: llmResponse.split('\n').slice(0, 3).filter(Boolean),
            keywords: extractKeywords(query, llmResponse),
          },
          actions: generateDefaultActions(query, url),
          confidence: 0.7,
          explainability: 'Generated from LLM response',
          hallucination: sources.length >= 2 ? 'low' : 'medium',
        };
      }
    } catch (parseError) {
      console.error('[Agent] Failed to parse LLM response:', parseError);
      // Fallback response
      parsedResponse = {
        summary: {
          short: llmResponse.slice(0, 200) || `Research summary for: ${query}`,
          bullets: ['Analysis in progress', 'Sources found', 'Actions suggested'],
          keywords: extractKeywords(query, llmResponse),
        },
        actions: generateDefaultActions(query, url),
        confidence: 0.6,
        explainability: 'LLM response parsing failed, using fallback',
        hallucination: 'medium',
      };
    }

    // 5. Build final response
    const response = {
      agent_version: 'v1.0',
      ...parsedResponse,
      citations: sources.length,
      query: query,
      processing_time_ms: Date.now() - startTime,
    };

    return reply.send(response);
  } catch (error) {
    console.error('[Agent] Research error:', error);
    return reply.code(500).send({
      error: 'Research agent failed',
      message: error.message,
    });
  }
}

/**
 * POST /api/agent/execute
 * Execute agent actions
 */
export async function executeAgent(req, reply) {
  try {
    const { actions, session_id, user_id: _user_id } = req.body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return reply.code(400).send({
        error: 'Invalid actions',
        message: 'Actions must be a non-empty array',
      });
    }

    const results = [];
    const errors = [];

    for (const action of actions) {
      try {
        let result;
        switch (action.type) {
          case 'open_tabs':
            result = await executeOpenTabs(action.payload);
            break;
          case 'search':
            result = await executeSearch(action.payload);
            break;
          case 'save_note':
            result = await executeSaveNote(action.payload);
            break;
          case 'export_session':
            result = await executeExportSession(action.payload);
            break;
          default:
            result = { status: 'skipped', reason: `Unknown action type: ${action.type}` };
        }
        results.push({ action_id: action.id, ...result });
      } catch (error) {
        errors.push({ action_id: action.id, error: error.message });
      }
    }

    // Log execution (for audit trail)
    if (session_id) {
      // TODO: Save to agent_events table
      console.log('[Agent] Execution logged:', {
        session_id,
        actions: actions.length,
        results: results.length,
      });
    }

    return reply.send({
      status: 'ok',
      results,
      errors: errors.length > 0 ? errors : undefined,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Agent] Execute error:', error);
    return reply.code(500).send({
      error: 'Execution failed',
      message: error.message,
    });
  }
}

// Helper functions

async function callOllama(systemPrompt, userPrompt) {
  const axios = (await import('axios')).default;
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  try {
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      },
    });

    return response.data.response || '';
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama is not running. Start it with: ollama serve');
    }
    throw error;
  }
}

function extractKeywords(query, text) {
  const words = (query + ' ' + text).toLowerCase().split(/\s+/);
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ]);
  const keywords = [...new Set(words.filter(w => w.length > 3 && !commonWords.has(w)))].slice(0, 5);
  return keywords;
}

function generateDefaultActions(query, url) {
  const actions = [];

  if (url) {
    actions.push({
      id: 'act_open_1',
      type: 'open_tabs',
      label: 'Open URL',
      payload: { tabs: [{ title: 'Research URL', url }] },
    });
  }

  actions.push({
    id: 'act_search_1',
    type: 'search',
    label: `Search: ${query}`,
    payload: { query },
  });

  return actions;
}

async function executeOpenTabs(_payload) {
  // This will be handled by Tauri frontend
  return { status: 'queued', message: 'Tabs will be opened by frontend' };
}

async function executeSearch(_payload) {
  // This will be handled by Tauri frontend
  return { status: 'queued', message: 'Search will be executed by frontend' };
}

async function executeSaveNote(_payload) {
  // This will be handled by Tauri SQLite
  return { status: 'queued', message: 'Note will be saved by Tauri' };
}

async function executeExportSession(_payload) {
  // This will be handled by Tauri
  return { status: 'queued', message: 'Session will be exported by Tauri' };
}
