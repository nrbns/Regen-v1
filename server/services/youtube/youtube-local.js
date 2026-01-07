/* eslint-env node */
/**
 * Local YouTube Analysis (On-Prem)
 * Uses local models instead of cloud APIs
 */

import axios from 'axios';
import fs from 'fs';
import { analyzeYouTube as baseAnalyzeYouTube } from './youtube-analyzer.js';
import { callLocalLLM } from '../ollama/local-llm.js';

/**
 * Analyze YouTube with local models only
 */
export async function analyzeYouTubeLocal(url) {
  // Force local LLM mode
  const originalUseLocalLLM = process.env.USE_LOCAL_LLM;
  process.env.USE_LOCAL_LLM = 'true';
  process.env.GEMINI_API_KEY = ''; // Disable Gemini

  try {
    const result = await baseAnalyzeYouTube(url);
    return result;
  } finally {
    // Restore original setting
    if (originalUseLocalLLM !== undefined) {
      process.env.USE_LOCAL_LLM = originalUseLocalLLM;
    }
  }
}

/**
 * Extract frames and analyze with local vision model
 */
export async function analyzeFramesLocal(frames, transcript, title, url) {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  const prompt = `You are watching the YouTube video: "${title}" (${url})

Transcript:
${transcript.substring(0, 15000)}

Analyze this video like a world-class intelligence analyst:

• One-sentence punchline
• 5 Key Insights (numbered, bold)
• Hidden Gem / Easter egg most viewers miss
• Strongest Counter-Argument or flaw in the video
• Who actually benefits from this narrative?
• Credibility score 1–10 with justification

Then generate a 60-second script for a TikTok/Shorts response video.

Be brutally honest and maximally insightful.`;

  // Use LLaVA for vision + text analysis
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: 'llava', // Vision-language model
        prompt,
        images: frames.map(frame => {
          // Convert image to base64
          const imageBuffer = fs.readFileSync(frame);
          return imageBuffer.toString('base64');
        }),
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 4000,
        },
      },
      { timeout: 180000 } // 3 minutes for vision analysis
    );

    return response.data.response;
  } catch (error) {
    // Fallback to text-only if vision model not available
    console.warn('[YouTubeLocal] Vision analysis failed, using text-only:', error.message);
    return await callLocalLLM(prompt, {
      model: 'llama3.1',
      temperature: 0.8,
      maxTokens: 4000,
    });
  }
}
