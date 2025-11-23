/* eslint-env node */

/**
 * Legacy wrapper - delegates to analyzeWithLLM for backward compatibility
 */
export async function analyzeScrapedContent({ url, question, body }) {
  // Import here to avoid circular dependency
  const { analyzeWithLLM } = await import('./llm.js');
  const task = question ? 'qa' : 'summarize';
  const result = await analyzeWithLLM({
    task,
    inputText: body,
    url,
    question,
  });
  return {
    answer: result.answer,
    model: result.model.name,
    sources: [url],
  };
}
