/* eslint-env node */
/**
 * Vision Model Provider
 * Switches between free cloud vision APIs and local models
 */

import axios from 'axios';
import fs from 'fs';
import { isOffline } from './mode-manager.js';
import { callLocalLLM } from '../services/ollama/local-llm.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Get vision model (online or offline)
 */
export async function getVisionModel() {
  if (isOffline()) {
    // Offline: Use local vision model (moondream2, llava, etc.)
    return {
      type: 'ollama',
      model: 'moondream2', // Lightweight vision model
      analyze: async (images, prompt) => {
        return await analyzeWithLocalVision(images, prompt);
      },
    };
  } else {
    // Online: Use free Gemini Flash or Claude via Poe
    return {
      type: 'cloud',
      provider: GEMINI_API_KEY ? 'gemini' : 'poe',
      analyze: async (images, prompt) => {
        if (GEMINI_API_KEY) {
          return await analyzeWithGemini(images, prompt);
        } else {
          return await analyzeWithPoe(images, prompt);
        }
      },
    };
  }
}

/**
 * Analyze with local vision model (Ollama)
 */
async function analyzeWithLocalVision(images, prompt) {
  try {
    // Convert images to base64
    const imageData = images.map(imagePath => {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        return imageBuffer.toString('base64');
      }
      return null;
    }).filter(Boolean);

    if (imageData.length === 0) {
      throw new Error('No valid images provided');
    }

    // Use moondream2 or llava for vision
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: 'moondream2',
        prompt,
        images: imageData,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      },
      { timeout: 180000 }
    );

    return response.data.response;
  } catch (error) {
    // Fallback to text-only if vision fails
    console.warn('[VisionProvider] Vision analysis failed, using text-only');
    return await callLocalLLM(prompt, { model: 'llama3.1' });
  }
}

/**
 * Analyze with Gemini (free tier)
 */
async function analyzeWithGemini(images, prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    // Convert images to base64
    const imageParts = images.map(imagePath => {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        return {
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        };
      }
      return null;
    }).filter(Boolean);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            ...imageParts,
          ],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    throw new Error(`Gemini vision failed: ${error.message}`);
  }
}

/**
 * Analyze with Poe (free Claude vision)
 */
async function analyzeWithPoe(images, prompt) {
  // Poe API would go here
  // For now, fallback to text-only
  console.warn('[VisionProvider] Poe vision not implemented, using text-only');
  return prompt; // Placeholder
}




