/**
 * AI Proxy Service
 * Unified interface for AI text editing (local Ollama or cloud LLM)
 */

import type { EditTask, EditOptions } from '../types';

const PROMPT_TEMPLATES: Record<EditTask, (text: string, options: EditOptions) => string> = {
  rewrite: (text, options) => `
You are a professional editor. Rewrite the following text ${options.style === 'concise' ? 'to be concise and clear' : options.style === 'formal' ? 'in a formal, professional tone' : 'while preserving the original meaning and style'}.

Keep all factual numbers and data intact. Preserve section headings and structure. Output only the edited text, no explanations.

Text:
${text}
`,

  grammar: text => `
You are a grammar expert. Fix all grammar, spelling, and punctuation errors in the following text. Preserve the original meaning and style. Output only the corrected text.

Text:
${text}
`,

  summarize: text => `
You are a summarization expert. Create a concise summary of the following text, capturing the main points and key information. Output only the summary.

Text:
${text}
`,

  expand: text => `
You are a writing assistant. Expand the following text with more detail, examples, and explanations while maintaining the original structure and meaning. Output only the expanded text.

Text:
${text}
`,

  translate: (text, options) => `
You are a professional translator. Translate the following text to ${options.language || 'English'}. Preserve the meaning, tone, and formatting. Output only the translated text.

Text:
${text}
`,

  formal: text => `
You are a professional editor. Rewrite the following text in a formal, professional tone suitable for business or academic contexts. Maintain all factual information. Output only the edited text.

Text:
${text}
`,

  casual: text => `
You are a writing assistant. Rewrite the following text in a casual, friendly tone. Maintain the original meaning and key information. Output only the edited text.

Text:
${text}
`,

  concise: text => `
You are a professional editor. Rewrite the following text to be concise and clear, removing unnecessary words while preserving all important information and meaning. Output only the edited text.

Text:
${text}
`,

  bulletize: text => `
You are a writing assistant. Convert the following text into a bullet-point list format, organizing information clearly and concisely. Output only the bullet points.

Text:
${text}
`,

  normalize: text => `
You are a data normalization expert. Normalize and clean the following text data, standardizing formats, removing inconsistencies, and organizing information clearly. Output only the normalized text.

Text:
${text}
`,

  'fill-template': (text, options) => {
    const replacements = Object.entries(options.template || {})
      .map(([key, value]) => `${key} = ${value}`)
      .join(', ');
    return `
You are a template filling assistant. Fill in the template placeholders in the following text with the provided values: ${replacements}. Output only the filled text.

Text:
${text}
`;
  },
};

export const aiProxy = {
  /**
   * Edit text using AI
   */
  async editText(text: string, task: EditTask, options: EditOptions): Promise<string> {
    const prompt = PROMPT_TEMPLATES[task](text, options);

    // Try local Ollama first (privacy-first)
    if (!options.cloudLLM) {
      try {
        return await this.callLocalLLM(prompt);
      } catch (error) {
        console.warn('[AIProxy] Local LLM failed, falling back to cloud:', error);
        // Fall through to cloud
      }
    }

    // Use cloud LLM (requires consent)
    return await this.callCloudLLM(prompt, options);
  },

  /**
   * Call local Ollama LLM
   */
  async callLocalLLM(prompt: string): Promise<string> {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Local LLM not available');
    }

    const data = await response.json();
    return data.response || '';
  },

  /**
   * Call cloud LLM (OpenAI/Anthropic)
   */
  async callCloudLLM(prompt: string, _options: EditOptions): Promise<string> {
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Cloud LLM API key not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.'
      );
    }

    // Use OpenAI by default
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional document editor.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloud LLM failed: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },
};
