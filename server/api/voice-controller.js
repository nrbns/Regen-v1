/**
 * Voice Recognition Controller
 * Handles /api/voice/recognize endpoint for STT
 */

const { handleMessage } = require('../../electron/services/regen/core');

/**
 * Handle voice recognition
 * Accepts audio file or audio data, converts to text, then forwards to Regen
 * Supports Indian languages (Tamil, Hindi, etc.)
 */
async function handleVoiceRecognize(request, reply) {
  try {
    // For now, accept text transcription (client-side STT)
    // In production, integrate with:
    // - Google Cloud Speech-to-Text (supports Indian languages)
    // - Azure Speech Services (supports Indian languages)
    // - Whisper (multilingual, but may need fine-tuning for Indian languages)
    const { transcription, detectedLanguage, sessionId, tabId, context, mode } = request.body;

    if (!transcription) {
      return reply.status(400).send({
        success: false,
        error: 'Missing transcription',
      });
    }

    // Forward to Regen with language context
    const response = await handleMessage({
      sessionId: sessionId || 'voice-session',
      message: transcription,
      mode: mode || 'research',
      source: 'voice',
      tabId,
      context,
    });

    return reply.send({
      success: true,
      transcription,
      detectedLanguage: detectedLanguage || 'en',
      response,
    });
  } catch (error) {
    request.log.error({ error }, 'Voice recognition failed');
    return reply.status(500).send({
      success: false,
      error: error.message || 'Voice recognition failed',
    });
  }
}

module.exports = {
  handleVoiceRecognize,
};
