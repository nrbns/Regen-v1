/**
 * Agent Suggestions API
 * Generates context-aware suggestions for Agent AI (Comet/Atlas/Genspark-like)
 */

/**
 * Generate suggestions based on query and context
 */
export function generateAgentSuggestions(query, _lastResponse = '', context = {}) {
  const suggestions = [];

  const lowerQuery = query.toLowerCase();

  // Follow-up questions based on query type
  if (lowerQuery.includes('explain') || lowerQuery.includes('what is')) {
    suggestions.push({
      id: 'suggest-1',
      text: 'Tell me more about this topic',
      category: 'follow-up',
      icon: 'sparkles',
    });
    suggestions.push({
      id: 'suggest-2',
      text: 'What are the main points?',
      category: 'follow-up',
      icon: 'sparkles',
    });
  }

  if (lowerQuery.includes('how') || lowerQuery.includes('step')) {
    suggestions.push({
      id: 'suggest-3',
      text: 'Show me examples',
      category: 'action',
      icon: 'zap',
    });
    suggestions.push({
      id: 'suggest-4',
      text: 'What are the requirements?',
      category: 'follow-up',
      icon: 'lightbulb',
    });
  }

  // Quick actions
  suggestions.push({
    id: 'suggest-5',
    text: 'Summarize in bullet points',
    category: 'quick',
    icon: 'zap',
  });

  if (context?.url) {
    suggestions.push({
      id: 'suggest-6',
      text: 'Analyze this page',
      category: 'action',
      icon: 'sparkles',
    });
  }

  // Default suggestions if none generated
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'suggest-default-1',
      text: 'Can you elaborate?',
      category: 'follow-up',
      icon: 'sparkles',
    });
    suggestions.push({
      id: 'suggest-default-2',
      text: 'Give me examples',
      category: 'action',
      icon: 'zap',
    });
  }

  return suggestions.slice(0, 5);
}

/**
 * Enhance agent response with suggestions
 */
export function enhanceAgentResponse(response, query, context) {
  return {
    ...response,
    suggestions: generateAgentSuggestions(query, response.text || response.content || '', context),
  };
}
