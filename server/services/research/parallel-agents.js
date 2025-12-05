/* eslint-env node */
/**
 * Parallel Agent System
 * Executes 5 golden prompts in parallel and merges results
 */

import { generateAllQueries, getSystemPrompt } from './golden-prompts.js';
import { multiSourceSearch, diverseSearch } from './multi-source-search.js';
import { analyzeWithLLM } from '../agent/llm.js';

/**
 * Execute all 5 golden prompt strategies in parallel
 */
export async function executeParallelAgents(query, options = {}) {
  const {
    maxResultsPerAgent = 10,
    includeTwitter = true,
    includePDF = true,
    includeGitHub = true,
    includeArxiv = true,
  } = options;

  // Generate all queries from golden prompts
  const allQueries = generateAllQueries(query);
  
  // Group queries by strategy
  const queriesByStrategy = {};
  for (const { query: q, strategy } of allQueries) {
    if (!queriesByStrategy[strategy]) {
      queriesByStrategy[strategy] = [];
    }
    queriesByStrategy[strategy].push(q);
  }

  // Execute each strategy in parallel
  const agentPromises = Object.entries(queriesByStrategy).map(async ([strategy, queries]) => {
    try {
      const systemPrompt = getSystemPrompt(strategy);
      
      // Execute top queries for this strategy
      const topQueries = queries.slice(0, 3);
      const searchResults = await Promise.all(
        topQueries.map(q => 
          diverseSearch(q, {
            requirePDF: includePDF && strategy === 'primarySource',
            requireGitHub: includeGitHub && strategy === 'bleedingEdge',
            requireArxiv: includeArxiv && strategy === 'bleedingEdge',
          })
        )
      );

      // Combine results
      const combinedResults = searchResults.flatMap(r => r.results);
      
      // Deduplicate
      const seenUrls = new Set();
      const uniqueResults = [];
      for (const result of combinedResults) {
        if (result?.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          uniqueResults.push(result);
          if (uniqueResults.length >= maxResultsPerAgent) break;
        }
      }

      // Analyze with strategy-specific prompt
      const analysis = await analyzeWithLLM({
        task: 'qa',
        inputText: uniqueResults.map((r, i) => 
          `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
        ).join('\n\n'),
        question: query,
        systemPrompt,
      });

      return {
        strategy,
        results: uniqueResults,
        analysis: analysis.answer || analysis.summary || '',
        insights: analysis.highlights || [],
        count: uniqueResults.length,
      };
    } catch (error) {
      console.error(`[ParallelAgents] Strategy ${strategy} failed:`, error.message);
      return {
        strategy,
        results: [],
        analysis: '',
        insights: [],
        count: 0,
        error: error.message,
      };
    }
  });

  const agentResults = await Promise.all(agentPromises);

  return {
    agents: agentResults,
    totalResults: agentResults.reduce((sum, a) => sum + a.count, 0),
    strategies: Object.keys(queriesByStrategy),
  };
}

/**
 * Synthesize all agent results into final answer
 */
export async function synthesizeAgentResults(agentResults, query) {
  const { agents } = agentResults;

  // Build synthesis context
  const context = agents
    .filter(a => a.analysis && a.count > 0)
    .map((a, idx) => {
      return `=== ${a.strategy.toUpperCase()} ANALYSIS ===\n${a.analysis}\n\nKey Sources:\n${a.results.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.title} - ${r.url}`).join('\n')}`;
    })
    .join('\n\n');

  if (!context) {
    return {
      answer: 'Unable to generate answer from available sources.',
      insights: [],
      hiddenGem: null,
      contraView: null,
    };
  }

  // Generate final synthesis with special template
  const synthesisPrompt = `You are synthesizing research from multiple specialized agents. Create a compelling answer with this EXACT structure:

1. ONE-SENTENCE PUNCHLINE: Start with a surprising, definitive statement that captures the essence.

2. KEY INSIGHTS (3-5 bullets): The most important findings, each as a single sentence.

3. HIDDEN GEM: One surprising or non-obvious insight that most people miss.

4. CONTRA VIEW: The strongest argument AGAINST the mainstream view (if available).

5. LIVE SOURCES: List the most credible sources with brief previews.

Query: ${query}

Agent Analyses:
${context}

Generate the answer following the structure above.`;

  const synthesis = await analyzeWithLLM({
    task: 'qa',
    inputText: context,
    question: query,
    systemPrompt: synthesisPrompt,
  });

  // Extract structured parts from synthesis
  const answer = synthesis.answer || synthesis.summary || '';
  
  // Parse structured answer (simple extraction)
  const insights = extractBullets(answer);
  const hiddenGem = extractSection(answer, 'HIDDEN GEM', 'CONTRA VIEW');
  const contraView = extractSection(answer, 'CONTRA VIEW', 'LIVE SOURCES');

  return {
    answer,
    insights,
    hiddenGem,
    contraView,
    sources: agents.flatMap(a => a.results).slice(0, 10),
  };
}

function extractBullets(text) {
  const bulletRegex = /[•\-\*]\s*(.+?)(?=\n|$)/g;
  const matches = [];
  let match;
  while ((match = bulletRegex.exec(text)) !== null && matches.length < 5) {
    matches.push(match[1].trim());
  }
  return matches;
}

function extractSection(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  
  const endIdx = endMarker ? text.indexOf(endMarker, startIdx) : text.length;
  if (endIdx === -1) return text.substring(startIdx + startMarker.length).trim();
  
  return text.substring(startIdx + startMarker.length, endIdx).trim();
}




