/* eslint-env node */
/**
 * "Surprising Insight" Scorer
 * Ranks answer versions and picks the one with maximum "holy shit" factor
 */

import { analyzeWithLLM } from '../agent/llm.js';

/**
 * Score an answer for "holy shit" factor
 * Production version from Python code
 */
export async function scoreInsight(answer, query) {
  const scoringPrompt = `Rate this answer from 1–10 on "holy shit" factor:

- How surprising/novel is the core insight?
- How defensible with sources?
- How much would a power user screenshot this?

Answer only with a JSON: {"score": 9, "one_line_why": "..."}

Answer to evaluate:
${answer}

Query: ${query}

1. **Surprise Factor** (1-10): How surprising or unexpected is this information?
2. **Novelty** (1-10): How new or cutting-edge is this insight?
3. **Depth** (1-10): How deep and well-researched is the answer?
4. **Actionability** (1-10): How useful or actionable is this information?
5. **Contrarian Value** (1-10): Does it challenge conventional wisdom?

Answer to evaluate:
${answer}

Query: ${query}

Respond with ONLY a JSON object in this format:
{
  "surprise": 8,
  "novelty": 7,
  "depth": 9,
  "actionability": 6,
  "contrarian": 7,
  "overall": 7.4,
  "reasoning": "Brief explanation of the score"
}`;

  try {
    const result = await analyzeWithLLM({
      task: 'qa',
      inputText: answer,
      question: scoringPrompt,
      systemPrompt: 'You are an expert evaluator of research quality and insightfulness.',
    });

    // Try to parse JSON from response (production format)
    const jsonMatch = result.answer?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const score = JSON.parse(jsonMatch[0]);
        return {
          score: score.score || 5,
          one_line_why: score.one_line_why || 'No reason provided',
          answer,
          query,
        };
      } catch {
        // Fall through to heuristic
      }
    }

    // Fallback: Simple heuristic scoring
    return {
      surprise: estimateSurprise(answer),
      novelty: estimateNovelty(answer),
      depth: estimateDepth(answer),
      actionability: estimateActionability(answer),
      contrarian: estimateContrarian(answer),
      overall: 0,
      reasoning: 'Heuristic-based scoring',
      answer,
      query,
    };
  } catch (error) {
    console.warn('[InsightScorer] Scoring failed:', error.message);
    return {
      surprise: estimateSurprise(answer),
      novelty: estimateNovelty(answer),
      depth: estimateDepth(answer),
      actionability: estimateActionability(answer),
      contrarian: estimateContrarian(answer),
      overall: 0,
      reasoning: 'Fallback heuristic scoring',
      answer,
      query,
    };
  }
}

/**
 * Best of three: Generate 3 answers and pick the best
 * Production version from Python code
 */
export async function bestOfThree(topic, generateAnswerFunc) {
  // Generate 3 parallel answers
  const answers = await Promise.all([
    generateAnswerFunc(topic),
    generateAnswerFunc(topic),
    generateAnswerFunc(topic),
  ]);

  // Score all answers
  const scored = await Promise.all(
    answers.map(answer => scoreInsight(answer, topic))
  );

  // Find best by score
  const bestIdx = scored.reduce((best, current, idx) => 
    (current.score || 0) > (scored[best].score || 0) ? idx : best, 0
  );

  return {
    bestAnswer: answers[bestIdx],
    score: scored[bestIdx],
    allAnswers: answers,
    allScores: scored,
  };
}

/**
 * Score multiple answer versions and pick the best
 */
export async function pickBestAnswer(answers, query) {
  if (answers.length === 0) return null;
  if (answers.length === 1) return answers[0];

  // Score all answers in parallel
  const scores = await Promise.all(
    answers.map(answer => scoreInsight(answer, query))
  );

  // Find best by score (production format)
  const bestIdx = scores.reduce((best, current, idx) => 
    (current.score || 0) > (scores[best].score || 0) ? idx : best, 0
  );

  return {
    bestAnswer: answers[bestIdx],
    score: scores[bestIdx],
    allScores: scores.map((s, idx) => ({
      answer: answers[idx],
      score: s,
    })),
  };
}

// Heuristic scoring functions (fallback)
function estimateSurprise(answer) {
  const surpriseWords = ['surprising', 'unexpected', 'contrary', 'shocking', 'reveals', 'hidden', 'secret'];
  const count = surpriseWords.filter(word => answer.toLowerCase().includes(word)).length;
  return Math.min(10, 5 + count * 1.5);
}

function estimateNovelty(answer) {
  const noveltyWords = ['new', 'latest', 'recent', '2024', '2025', 'cutting-edge', 'bleeding-edge', 'emerging'];
  const count = noveltyWords.filter(word => answer.toLowerCase().includes(word)).length;
  return Math.min(10, 4 + count * 1.2);
}

function estimateDepth(answer) {
  const depth = answer.length / 100; // Longer answers = more depth
  return Math.min(10, Math.max(1, depth));
}

function estimateActionability(answer) {
  const actionWords = ['how to', 'steps', 'guide', 'tutorial', 'implementation', 'example', 'code'];
  const count = actionWords.filter(word => answer.toLowerCase().includes(word)).length;
  return Math.min(10, 3 + count * 1.5);
}

function estimateContrarian(answer) {
  const contrarianWords = ['however', 'but', 'despite', 'contrary', 'disagrees', 'challenges', 'debate'];
  const count = contrarianWords.filter(word => answer.toLowerCase().includes(word)).length;
  return Math.min(10, 2 + count * 1.5);
}

