/**
 * RelatedQuestions - Perplexity-style "People also ask" component
 */

import { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RelatedQuestion {
  question: string;
  relevance?: number;
  category?: string;
}

interface RelatedQuestionsProps {
  questions: RelatedQuestion[];
  onSelectQuestion: (question: string) => void;
  isLoading?: boolean;
}

export function RelatedQuestions({
  questions,
  onSelectQuestion,
  isLoading = false,
}: RelatedQuestionsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Related questions</h3>
      </div>
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <motion.button
            key={`question-${idx}`}
            type="button"
            onClick={() => onSelectQuestion(q.question)}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            disabled={isLoading}
            className="group w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-blue-400/40 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex-1 text-sm text-gray-200 transition-colors group-hover:text-white">
                {q.question}
              </span>
              <ChevronRight
                size={16}
                className={`text-gray-400 transition-all ${
                  hoveredIndex === idx ? 'translate-x-1 text-blue-400' : ''
                }`}
              />
            </div>
            {q.relevance !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${q.relevance}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{Math.round(q.relevance)}%</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/**
 * Generate related questions from a research query
 */
export function generateRelatedQuestions(
  query: string,
  sources: Array<{ title?: string; snippet?: string }>,
  maxQuestions: number = 5
): RelatedQuestion[] {
  // Simple keyword extraction and question generation
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'how', 'why', 'when', 'where', 'who'].includes(w));

  const questionTemplates = [
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

  // Use first few keywords to generate questions
  const generated: RelatedQuestion[] = [];
  for (let i = 0; i < Math.min(maxQuestions, questionTemplates.length); i++) {
    const template = questionTemplates[i];
    if (template && keywords.length > 0) {
      generated.push({
        question: template,
        relevance: 85 - i * 5,
        category: 'generated',
      });
    }
  }

  // Add context-based questions from sources
  if (sources.length > 0 && generated.length < maxQuestions) {
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
      if (generated.length < maxQuestions) {
        generated.push({
          question: `More about ${keyword}`,
          relevance: 70 - idx * 3,
          category: 'source-based',
        });
      }
    });
  }

  return generated.slice(0, maxQuestions);
}
