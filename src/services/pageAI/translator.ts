/**
 * Translation Service
 * Translates text using AI
 */

import { aiEngine } from '../../core/ai';
import {
  withDeterminism,
  _extractConfidence,
  _extractSources,
} from '../../core/ai/withDeterminism';
import { getUserId } from '../../utils/getUserId';

export interface TranslationOptions {
  targetLanguage?: string;
  sourceLanguage?: string;
}

/**
 * Translate text
 */
export async function translateText(
  text: string,
  options: TranslationOptions = {}
): Promise<string> {
  const targetLanguage = options.targetLanguage || 'English';
  const sourceLanguage = options.sourceLanguage || 'auto-detect';

  const prompt = `Translate the following text to ${targetLanguage}.
${sourceLanguage !== 'auto-detect' ? `Source language: ${sourceLanguage}` : 'Auto-detect the source language.'}

Text to translate:
"${text}"

Provide only the translation, no explanations or additional text.`;

  try {
    // DETERMINISM: Wrap AI operation with determinism
    const userId = getUserId();
    const deterministicRunner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
      userId,
      type: 'analysis',
      query: `Translate to ${targetLanguage}`,
      reasoning: `Translating text from ${sourceLanguage} to ${targetLanguage}`,
      sources: [window.location.href],
    });

    const result = await deterministicRunner({
      kind: 'chat',
      prompt,
      context: {
        task: 'translate',
        sourceLanguage,
        targetLanguage,
      },
    });

    return result.text.trim();
  } catch (error: any) {
    throw new Error(`Failed to translate: ${error.message}`);
  }
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<string> {
  const prompt = `Detect the language of the following text. Respond with only the language name (e.g., "English", "Hindi", "Spanish").

Text:
"${text.substring(0, 200)}"`;

  try {
    // DETERMINISM: Wrap AI operation with determinism
    const userId = getUserId();
    const deterministicRunner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
      userId,
      type: 'analysis',
      query: 'Detect language',
      reasoning: 'Detecting language of text',
      sources: [window.location.href],
    });

    const result = await deterministicRunner({
      kind: 'chat',
      prompt,
      context: {
        task: 'detect-language',
      },
    });

    return result.text.trim();
  } catch (error: any) {
    console.warn('[Translate] Language detection failed:', error);
    return 'Unknown';
  }
}
