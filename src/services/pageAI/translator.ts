/**
 * Translation Service
 * Translates text using AI
 */

import { aiEngine } from '../../core/ai';

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
    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt,
      context: {
        task: 'translate',
        sourceLanguage,
        targetLanguage,
      },
    });

    return result.text.trim();
  } catch {
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
    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt,
      context: {
        task: 'detect-language',
      },
    });

    return result.text.trim();
  } catch {
    return 'Unknown';
  }
}
