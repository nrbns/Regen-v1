/**
 * ImageAgent - Mode-specific agent for Image generation mode
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface ImagePrompt {
  text: string;
  negative?: string;
  style?: string;
  seed?: number;
}

export class ImageAgent {
  /**
   * Optimize prompt for image generation
   */
  async optimizePrompt(originalPrompt: string, style?: string): Promise<string> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      return originalPrompt;
    }

    try {
      const prompt = `Optimize this image generation prompt for better results: "${originalPrompt}"${style ? ` in ${style} style` : ''}. Return only the optimized prompt.`;
      
      return await ollama.chat([
        {
          role: 'system',
          content: 'You are an image prompt optimization assistant. Return only the optimized prompt, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);
    } catch {
      return originalPrompt;
    }
  }

  /**
   * Generate safe negative prompt
   */
  async generateNegativePrompt(positivePrompt: string): Promise<string> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      return 'low quality, blurry';
    }

    try {
      return await ollama.chat([
        {
          role: 'system',
          content: 'Generate a safe negative prompt for image generation (avoiding harmful content). Return only the negative prompt.',
        },
        {
          role: 'user',
          content: `Positive prompt: "${positivePrompt}"`,
        },
      ]);
    } catch {
      return 'low quality, blurry';
    }
  }

  /**
   * Extract style from prompt
   */
  extractStyle(prompt: string): string | null {
    const styleKeywords = ['realistic', 'anime', 'cartoon', 'oil painting', 'watercolor', 'digital art', 'photorealistic'];
    
    for (const style of styleKeywords) {
      if (prompt.toLowerCase().includes(style)) {
        return style;
      }
    }

    return null;
  }
}

