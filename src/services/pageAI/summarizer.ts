/**
 * Page Summarization Service
 * Generates summaries of page content
 */

import { analyzePage } from '../pageActions/analyzer';
import { aiEngine } from '../../core/ai';
import {
  withDeterminism,
  extractConfidence as _extractConfidence,
  extractSources as _extractSources,
} from '../../core/ai/withDeterminism';
import { getUserId } from '../../utils/getUserId';

export interface SummaryOptions {
  length?: 'short' | 'medium' | 'long';
  language?: string;
  includeKeyPoints?: boolean;
}

export interface PageSummary {
  summary: string;
  keyPoints?: string[];
  wordCount?: number;
  readingTime?: number; // minutes
  language?: string;
}

/**
 * Summarize page content
 */
export async function summarizePage(options: SummaryOptions = {}): Promise<PageSummary> {
  const analysis = await analyzePage();

  // Limit content for summary
  const maxLength = options.length === 'short' ? 3000 : options.length === 'long' ? 12000 : 6000;
  const content = document.body.innerText.substring(0, maxLength);

  const lengthInstruction = {
    short: 'Provide a brief summary in 2-3 sentences.',
    medium: 'Provide a concise summary in 1-2 paragraphs.',
    long: 'Provide a comprehensive summary with key details.',
  };

  const prompt = `Please summarize the following webpage:

Title: ${analysis.title}
URL: ${analysis.url}

Content:
${content}

${lengthInstruction[options.length || 'medium']}

${options.includeKeyPoints ? 'Also list the key points as bullet points.' : ''}
${options.language ? `Please provide the summary in ${options.language}.` : ''}`;

  try {
    // DETERMINISM: Wrap AI operation with determinism
    const userId = getUserId();
    const deterministicRunner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
      userId,
      type: 'analysis',
      query: `Summarize page: ${analysis.title}`,
      reasoning: `Page summarization: ${analysis.title} (${options.length || 'medium'} length)`,
      sources: [analysis.url],
    });

    const result = await deterministicRunner({
      kind: 'summary',
      prompt,
      context: {
        pageUrl: analysis.url,
        pageTitle: analysis.title,
        contentType: analysis.contentType,
      },
    });

    const summary = result.text || 'Unable to generate summary.';

    // Extract key points if requested
    let keyPoints: string[] | undefined;
    if (options.includeKeyPoints) {
      keyPoints = extractKeyPoints(summary);
    }

    // Calculate reading time (average 200 words per minute)
    const wordCount = summary.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      summary,
      keyPoints,
      wordCount,
      readingTime,
      language: options.language || analysis.language || 'en',
    };
  } catch (error: any) {
    throw new Error(`Failed to summarize page: ${error.message}`);
  }
}

/**
 * Extract key points from summary text
 */
function extractKeyPoints(text: string): string[] {
  // Look for bullet points, numbered lists, or dashes
  const bulletPattern = /[-•*]\s+(.+?)(?:\n|$)/g;
  const numberedPattern = /^\d+[\.)]\s+(.+?)$/gm;

  const points: string[] = [];

  // Extract bullet points
  let match;
  while ((match = bulletPattern.exec(text)) !== null) {
    points.push(match[1].trim());
  }

  // Extract numbered points
  while ((match = numberedPattern.exec(text)) !== null) {
    points.push(match[1].trim());
  }

  // If no bullets found, try to extract sentences (simple heuristic)
  if (points.length === 0) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 5).map(s => s.trim());
  }

  return points.slice(0, 10); // Limit to 10 points
}

/**
 * Summarize selected text
 */
export async function summarizeSelection(
  selectedText: string,
  options: SummaryOptions = {}
): Promise<string> {
  const prompt = `Please summarize the following text:

${selectedText.substring(0, 5000)}

${options.length === 'short' ? 'Provide a brief summary.' : 'Provide a concise summary.'}`;

  try {
    // DETERMINISM: Wrap AI operation with determinism
    const userId = getUserId();
    const deterministicRunner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
      userId,
      type: 'analysis',
      query: 'Summarize selected text',
      reasoning: `Summarizing selected text (${options.length || 'medium'} length)`,
      sources: [window.location.href],
    });

    const result = await deterministicRunner({
      kind: 'summary',
      prompt,
      context: {
        isSelection: true,
      },
    });

    return result.text || 'Unable to generate summary.';
  } catch (error: any) {
    throw new Error(`Failed to summarize selection: ${error.message}`);
  }
}
