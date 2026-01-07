/* eslint-env node */
/**
 * YouTube Analyzer
 * Full video → instant deep research report
 * Converted from Python production code
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USE_LOCAL_LLM = process.env.USE_LOCAL_LLM === 'true';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
  const regex =
    /(?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11}))/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Get transcript using youtube-transcript-api (via Python)
 */
async function getTranscript(videoId) {
  try {
    // Use youtube-transcript-api via Python
    const { stdout } = await execAsync(
      `python3 -c "from youtube_transcript_api import YouTubeTranscriptApi; import json; transcript = YouTubeTranscriptApi.get_transcript('${videoId}', languages=['en', 'en-US']); print(json.dumps(transcript))"`
    );

    const transcript = JSON.parse(stdout);
    const fullText = transcript.map(item => item.text).join(' ');
    return { transcript, fullText };
  } catch (error) {
    console.warn('[YouTubeAnalyzer] Transcript not available:', error.message);
    return { transcript: [], fullText: '[No transcript available – will use vision analysis]' };
  }
}

/**
 * Download video and extract frames using yt-dlp
 */
async function downloadVideoAndExtractFrames(url, videoId) {
  const tmpDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const videoPath = path.join(tmpDir, `${videoId}.webm`);
  const framesDir = path.join(tmpDir, `frames_${videoId}`);
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  try {
    // Download video with yt-dlp
    const _ydlOpts = {
      format: 'best[ext=webm]/best',
      output: videoPath,
      quiet: true,
    };

    const ydlCommand = `yt-dlp -f "best[ext=webm]/best" -o "${videoPath}" "${url}" --quiet`;
    await execAsync(ydlCommand);

    // Get video info
    const infoCommand = `yt-dlp --dump-json "${url}"`;
    const { stdout: infoJson } = await execAsync(infoCommand);
    const info = JSON.parse(infoJson);
    const duration = info.duration || 0;
    const title = info.title || 'Untitled';

    // Extract 5 evenly-spaced frames using ffmpeg
    const frames = [];
    const frameCount = 5;
    const interval = Math.max(1, Math.floor(duration / frameCount));

    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * interval;
      const framePath = path.join(framesDir, `frame_${timestamp}.jpg`);

      const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${framePath}" -y -loglevel error`;
      try {
        await execAsync(ffmpegCommand);
        if (fs.existsSync(framePath)) {
          frames.push(framePath);
        }
      } catch (error) {
        console.warn(`[YouTubeAnalyzer] Failed to extract frame at ${timestamp}s:`, error.message);
      }
    }

    return {
      videoPath,
      frames,
      title,
      duration,
      info,
    };
  } catch (error) {
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

/**
 * Analyze with Gemini (or local LLM)
 */
async function analyzeWithAI(transcript, frames, title, url) {
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

  if (USE_LOCAL_LLM) {
    // Use local Ollama with vision model
    return await analyzeWithLocalLLM(prompt, frames);
  } else if (GEMINI_API_KEY) {
    // Use Gemini API
    return await analyzeWithGemini(prompt, frames);
  } else {
    // Fallback: text-only analysis
    return await analyzeWithLocalLLM(prompt, []);
  }
}

/**
 * Analyze with Gemini API
 */
async function analyzeWithGemini(prompt, frames) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    // For Gemini, we'd need to use the Google Generative AI SDK
    // For now, use text-only analysis
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              // Note: Gemini vision would require base64 encoded images
              // This is simplified - full implementation would encode frames
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.warn('[YouTubeAnalyzer] Gemini API failed, using fallback:', error.message);
    return await analyzeWithLocalLLM(prompt, frames);
  }
}

/**
 * Analyze with local LLM (Ollama)
 */
async function analyzeWithLocalLLM(prompt, frames) {
  try {
    // Use Ollama with vision model (llava) or text-only
    const model = frames.length > 0 ? 'llava' : 'llama3.1';

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 4000,
        },
      },
      { timeout: 120000 }
    );

    return response.data.response;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Local LLM not available. Start Ollama or configure Gemini API key.');
    }
    throw error;
  }
}

/**
 * Main analysis function
 */
export async function analyzeYouTube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  console.log(`[YouTubeAnalyzer] Analyzing video: ${videoId}`);

  // Step 1: Get transcript
  const { transcript, fullText } = await getTranscript(videoId);

  // Step 2: Download video and extract frames
  const { videoPath, frames, title, duration, info } = await downloadVideoAndExtractFrames(
    url,
    videoId
  );

  // Step 3: Analyze with AI
  let researchReport;
  try {
    researchReport = await analyzeWithAI(fullText, frames, title, url);
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      frames.forEach(frame => {
        if (fs.existsSync(frame)) fs.unlinkSync(frame);
      });
      const framesDir = path.dirname(frames[0] || '');
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('[YouTubeAnalyzer] Cleanup error:', error.message);
    }
  }

  return {
    title,
    url,
    videoId,
    duration,
    transcript_length: fullText.length,
    transcript: transcript.slice(0, 10), // First 10 entries as sample
    research_report: researchReport,
    ready_for_video: true,
    thumbnail: info.thumbnail || null,
  };
}

/**
 * Extract 60-second script from research report
 */
export function extractVideoScript(researchReport) {
  // Look for script section in the report
  const scriptMatch = researchReport.match(/60-second script[:\n]+([\s\S]+?)(?:\n\n|\n#|$)/i);
  if (scriptMatch) {
    return scriptMatch[1].trim();
  }

  // Fallback: Use last paragraph or generate from insights
  const lines = researchReport.split('\n');
  const insights = lines.filter(line => /^\d+\./.test(line.trim())).slice(0, 5);
  return insights.join('\n\n') + '\n\nThis is a 60-second response to the original video.';
}
