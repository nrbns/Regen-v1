/* eslint-env node */
/**
 * Auto-Generated 60-Second Video Summary
 * HeyGen API integration
 * Converted from Python production code
 */

import axios from 'axios';
import fs from 'fs';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = process.env.HEYGEN_API_URL || 'https://api.heygen.com/v2';

/**
 * Generate video summary from text
 */
export async function generateVideoSummary(text, voiceId = null) {
  if (!HEYGEN_API_KEY) {
    throw new Error('HEYGEN_API_KEY not configured');
  }

  const headers = {
    'X-API-KEY': HEYGEN_API_KEY,
    'Content-Type': 'application/json',
  };

  // Step 1: Create video from text
  const data = {
    text: text.substring(0, 2000), // Trim to fit 60s
    voice_id: voiceId || 'default-en-male', // Use cloned voice if provided
    duration: 60, // Target 60s
    dimensions: {
      width: 1920,
      height: 1080,
    },
    style: 'professional-summary', // Assuming HeyGen supports styles
  };

  try {
    const response = await axios.post(`${HEYGEN_API_URL}/video/generate`, data, { headers });

    if (response.status !== 200) {
      throw new Error(`HeyGen API error: ${response.statusText}`);
    }

    const videoId = response.data.video_id || response.data.id;

    if (!videoId) {
      throw new Error('No video ID returned from HeyGen');
    }

    // Step 2: Poll for completion (HeyGen is async)
    const maxAttempts = 30; // Max 5 min wait (30 * 10s)
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await axios.get(
          `${HEYGEN_API_URL}/video/status/${videoId}`,
          { headers }
        );

        const status = statusResponse.data.status || statusResponse.data.state;

        if (status === 'completed' || status === 'ready') {
          return {
            success: true,
            video_url: statusResponse.data.video_url || statusResponse.data.url,
            video_id: videoId,
            duration: statusResponse.data.duration || 60,
          };
        }

        if (status === 'failed' || status === 'error') {
          throw new Error(`Video generation failed: ${statusResponse.data.error || 'Unknown error'}`);
        }

        // Still processing
        console.log(`[VideoSummary] Video ${videoId} status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);
      } catch (error) {
        if (error.response?.status === 404) {
          // Video not found yet, continue polling
          continue;
        }
        throw error;
      }
    }

    throw new Error('Video generation timeout - exceeded max polling attempts');
  } catch (error) {
    if (error.response) {
      throw new Error(`HeyGen API error: ${error.response.data?.message || error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Clone voice from audio sample
 */
export async function cloneVoice(audioFile, voiceName) {
  if (!HEYGEN_API_KEY) {
    throw new Error('HEYGEN_API_KEY not configured');
  }

  const headers = {
    'X-API-KEY': HEYGEN_API_KEY,
  };

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('audio', fs.createReadStream(audioFile));
  form.append('name', voiceName || 'custom-voice');

  try {
    const response = await axios.post(`${HEYGEN_API_URL}/voice/clone`, form, {
      headers: {
        ...headers,
        ...form.getHeaders(),
      },
    });

    return {
      success: true,
      voice_id: response.data.voice_id,
      voice_name: response.data.name,
    };
  } catch (error) {
    throw new Error(`Voice cloning failed: ${error.response?.data?.message || error.message}`);
  }
}

