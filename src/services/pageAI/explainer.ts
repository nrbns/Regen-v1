/**
 * Page Explanation Service
 * Explains page content, concepts, or selected text
 */

import { analyzePage } from '../pageActions/analyzer';
import { aiEngine } from '../../core/ai';

export interface ExplanationOptions {
  level?: 'simple' | 'detailed' | 'expert';
  language?: string;
  focus?: string; // Focus area (e.g., "technical terms", "main concepts")
}

export interface PageExplanation {
  explanation: string;
  concepts?: string[];
  relatedTopics?: string[];
}

/**
 * Explain page content
 */
export async function explainPage(options: ExplanationOptions = {}): Promise<PageExplanation> {
  const analysis = await analyzePage();
  const content = document.body.innerText.substring(0, 8000);

  const levelInstruction = {
    simple: 'Explain in simple terms that anyone can understand.',
    detailed: 'Provide a detailed explanation with context.',
    expert: 'Provide an expert-level explanation with technical details.',
  };

  const prompt = `Please explain the following webpage:

Title: ${analysis.title}
URL: ${analysis.url}

Content:
${content}

${levelInstruction[options.level || 'detailed']}

${options.focus ? `Focus on: ${options.focus}` : ''}
${options.language ? `Please provide the explanation in ${options.language}.` : ''}

Provide a clear explanation of what this page is about, its main concepts, and key information.`;

  try {
    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt,
      context: {
        pageUrl: analysis.url,
        pageTitle: analysis.title,
        contentType: analysis.contentType,
      },
    });

    const explanation = result.text || 'Unable to generate explanation.';

    // Extract concepts (simplified - in production, use NER)
    const concepts = extractConcepts(explanation);

    return {
      explanation,
      concepts,
    };
  } catch (error: any) {
    throw new Error(`Failed to explain page: ${error.message}`);
  }
}

/**
 * Explain selected text or a specific concept
 */
export async function explainText(text: string, options: ExplanationOptions = {}): Promise<string> {
  const levelInstruction = {
    simple: 'Explain in simple terms.',
    detailed: 'Provide a detailed explanation.',
    expert: 'Provide an expert-level explanation.',
  };

  const prompt = `Please explain the following:

"${text.substring(0, 2000)}"

${levelInstruction[options.level || 'detailed']}
${options.language ? `Please provide the explanation in ${options.language}.` : ''}`;

  try {
    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt,
      context: {
        isSelection: true,
      },
    });

    return result.text || 'Unable to generate explanation.';
  } catch (error: any) {
    throw new Error(`Failed to explain text: ${error.message}`);
  }
}

/**
 * Extract key concepts from explanation (simplified)
 */
function extractConcepts(text: string): string[] {
  // Simple heuristic: look for capitalized phrases and technical terms
  // In production, use proper NER or keyword extraction
  const sentences = text.split(/[.!?]+/);
  const concepts: string[] = [];

  for (const sentence of sentences) {
    // Look for capitalized phrases (potential concepts)
    const capitalized = sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalized) {
      concepts.push(...capitalized.slice(0, 2));
    }
  }

  return [...new Set(concepts)].slice(0, 10); // Unique concepts, limit to 10
}

