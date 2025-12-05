/* eslint-env node */
/**
 * LangGraph-Style Agent Workflow
 * 5 Golden Agents + Final Synthesis
 * Node.js implementation of the Python LangGraph workflow
 */

import { executeParallelAgents, synthesizeAgentResults } from './parallel-agents.js';
import { analyzeWithLLM } from '../agent/llm.js';

/**
 * The 5 Golden Prompts (exact from production code)
 */
const GOLDEN_PROMPTS = [
  `Act as a world-class intelligence analyst with access to real-time web + X data. Use a multi-hop reasoning chain. First, list 8–12 highly specific, non-obvious search queries that would reveal hidden truths or cutting-edge developments on this topic (include arXiv, GitHub, patents, obscure forums, and deep X threads). Then execute the top 5 in parallel. Finally, synthesize into a surprising, defensible answer with live citations.`,
  
  `Search X for the last 72 hours using 6 different advanced operators (from:, since:, filter:links, min_retweets:50, etc.). Look for takes from verified engineers, founders, or researchers with >10k followers. Extract signal vs noise. Quote the 4 most important tweets verbatim with links.`,
  
  `Find the 3 strongest recent arguments AGAINST the current mainstream view on this topic. Prioritize sources that are credentialed but dissenting (e.g. Stanford professor vs consensus, leaked internal docs, etc.).`,
  
  `Go directly to the original paper / commit / SEC filing / patent / court document. Quote the exact paragraph that matters. Never rely on secondary articles.`,
  
  `Search arXiv, HuggingFace, GitHub "stars:>1000 created:>2025-09-01", and v0/vercel showcases for implementations that are <90 days old.`,
];

/**
 * Final Synthesis Prompt (exact from production)
 */
const SYNTHESIS_PROMPT = `You are five expert analyses on the same topic.

Create a jaw-dropping final answer with this exact structure:

- One-sentence punchline (maximum 18 words)

- 5 Key Insights (numbered, bold)

- Hidden Gem (the thing 99% of people miss)

- Strongest Counter-Argument

- Sources (markdown list with live links + one-sentence preview)

Make it feel like intelligence porn.`;

/**
 * Execute LangGraph-style workflow
 */
export async function executeLangGraphWorkflow(topic) {
  const startTime = Date.now();

  // Step 1: Execute 5 parallel agents (using existing parallel-agents system)
  console.log('[LangGraphWorkflow] Executing 5 golden agents...');
  const agentResults = await executeParallelAgents(topic, {
    maxResultsPerAgent: 10,
    includeTwitter: true,
    includePDF: true,
    includeGitHub: true,
    includeArxiv: true,
  });

  // Step 2: Build intermediate results from all agents
  const intermediate = agentResults.agents
    .filter(a => a.analysis && a.count > 0)
    .map(a => a.analysis);

  if (intermediate.length === 0) {
    throw new Error('No agent results to synthesize');
  }

  // Step 3: Final synthesis agent
  console.log('[LangGraphWorkflow] Running synthesis agent...');
  const synthesisContext = intermediate.join('\n\n---\n\n');
  
  const synthesis = await analyzeWithLLM({
    task: 'qa',
    inputText: synthesisContext,
    question: topic,
    systemPrompt: SYNTHESIS_PROMPT,
  });

  const finalAnswer = synthesis.answer || synthesis.summary || '';

  // Step 4: Parse structured answer
  const parsed = parseStructuredAnswer(finalAnswer);

  return {
    topic,
    answer: finalAnswer,
    punchline: parsed.punchline,
    insights: parsed.insights,
    hiddenGem: parsed.hiddenGem,
    counterArgument: parsed.counterArgument,
    sources: parsed.sources,
    agentResults: agentResults.agents.map(a => ({
      strategy: a.strategy,
      count: a.count,
    })),
    latency_ms: Date.now() - startTime,
  };
}

/**
 * Parse structured answer into components
 */
function parseStructuredAnswer(text) {
  const result = {
    punchline: null,
    insights: [],
    hiddenGem: null,
    counterArgument: null,
    sources: [],
  };

  // Extract punchline (first sentence, max 18 words)
  const punchlineMatch = text.match(/^([^.!?]+[.!?])/);
  if (punchlineMatch) {
    const words = punchlineMatch[1].split(/\s+/);
    result.punchline = words.slice(0, 18).join(' ');
  }

  // Extract key insights (numbered or bulleted)
  const insightsRegex = /(?:^|\n)(?:\d+\.|\*|\-)\s*\*\*([^*]+)\*\*|(?:^|\n)(?:\d+\.|\*|\-)\s*([^\n]+)/gm;
  let match;
  while ((match = insightsRegex.exec(text)) !== null && result.insights.length < 5) {
    const insight = (match[1] || match[2] || '').trim();
    if (insight) result.insights.push(insight);
  }

  // Extract hidden gem
  const hiddenGemMatch = text.match(/Hidden Gem[:\-]?\s*([^\n]+(?:\n[^\n]+){0,2})/i);
  if (hiddenGemMatch) {
    result.hiddenGem = hiddenGemMatch[1].trim();
  }

  // Extract counter argument
  const counterMatch = text.match(/(?:Strongest\s+)?Counter[-\s]?Argument[:\-]?\s*([^\n]+(?:\n[^\n]+){0,3})/i);
  if (counterMatch) {
    result.counterArgument = counterMatch[1].trim();
  }

  // Extract sources (markdown links)
  const sourceRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  while ((match = sourceRegex.exec(text)) !== null) {
    result.sources.push({
      title: match[1],
      url: match[2],
    });
  }

  return result;
}




