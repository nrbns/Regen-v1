/* eslint-env node */
/**
 * YouTube to Response Video
 * One-click "Turn This YouTube into a 60s Response Video"
 */

import { analyzeYouTube, extractVideoScript } from './youtube-analyzer.js';
import { generateVideoSummary } from '../video/video-summary.js';

/**
 * Convert YouTube video to 60-second response video
 */
export async function youtubeToResponseVideo(youtubeUrl, voiceId = null) {
  // Step 1: Run analysis
  console.log('[YouTubeToVideo] Analyzing YouTube video...');
  const analysis = await analyzeYouTube(youtubeUrl);

  // Step 2: Extract 60-second script
  const script = extractVideoScript(analysis.research_report);

  // Step 3: Generate response video using HeyGen (or local TTS)
  console.log('[YouTubeToVideo] Generating response video...');
  let responseVideoUrl = null;
  let videoError = null;

  try {
    const videoResult = await generateVideoSummary(script, voiceId);
    responseVideoUrl = videoResult.video_url;
  } catch (error) {
    console.warn('[YouTubeToVideo] Video generation failed:', error.message);
    videoError = error.message;
    // Continue without video - user still gets research report
  }

  return {
    original: youtubeUrl,
    original_title: analysis.title,
    response_video_url: responseVideoUrl,
    research_report: analysis.research_report,
    script,
    video_error: videoError,
    success: true,
  };
}




