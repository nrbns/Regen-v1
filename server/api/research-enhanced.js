/**
 * Enhanced Research API - Supports related questions generation
 */

/**
 * Generate related questions from query and sources
 * This matches the frontend RelatedQuestions functionality
 */
export function generateRelatedQuestions(query, sources = [], maxQuestions = 5) {
  const questions = [];

  // Extract keywords from query
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'how', 'why', 'when', 'where', 'who'].includes(w));

  // Question templates
  const templates = [
    `What is ${keywords[0]}?`,
    `How does ${keywords[0]} work?`,
    `Why is ${keywords[0]} important?`,
    `When was ${keywords[0]} introduced?`,
    `Where is ${keywords[0]} used?`,
    `Who created ${keywords[0]}?`,
    `Best practices for ${keywords[0]}`,
    `${keywords[0]} vs alternatives`,
    `Latest developments in ${keywords[0]}`,
    `Benefits of ${keywords[0]}`,
  ];

  // Generate questions from templates
  for (let i = 0; i < Math.min(maxQuestions, templates.length); i++) {
    const template = templates[i];
    if (template && keywords.length > 0) {
      questions.push({
        question: template,
        relevance: 85 - i * 5,
        category: 'generated',
      });
    }
  }

  // Add context-based questions from sources
  if (sources.length > 0 && questions.length < maxQuestions) {
    const sourceKeywords = sources
      .slice(0, 3)
      .flatMap(s => {
        const text = (s.title || '') + ' ' + (s.snippet || '');
        return text
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 4)
          .slice(0, 2);
      })
      .filter(Boolean);

    sourceKeywords.forEach((keyword, idx) => {
      if (questions.length < maxQuestions) {
        questions.push({
          question: `More about ${keyword}`,
          relevance: 70 - idx * 3,
          category: 'source-based',
        });
      }
    });
  }

  return questions.slice(0, maxQuestions);
}

/**
 * Enhance research result with related questions
 */
export function enhanceResearchResult(result, query, sources) {
  return {
    ...result,
    relatedQuestions: generateRelatedQuestions(query, sources, 5),
  };
}
