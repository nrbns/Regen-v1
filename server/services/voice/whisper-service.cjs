/**
 * Whisper STT Service
 * Streaming speech-to-text using Whisper (Ollama or OpenAI)
 */

const axios = require('axios');
const Pino = require('pino');

const logger = Pino({ name: 'whisper-service' });

class WhisperService {
  constructor() {
    this.provider = process.env.WHISPER_PROVIDER || 'ollama';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Transcribe audio using Ollama Whisper
   */
  async _transcribeOllama(audioBuffer, options = {}) {
    const model = options.model || 'whisper';
    
    try {
      // Ollama Whisper API
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model,
          prompt: 'transcribe',
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // For audio, we'd need to send the audio buffer
      // This is a simplified version - actual implementation needs audio handling
      return {
        text: response.data.response || '',
        language: 'en',
        confidence: 0.9,
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Ollama transcription failed');
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async _transcribeOpenAI(audioBuffer, options = {}) {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      form.append('model', 'whisper-1');
      form.append('language', options.language || 'en');
      form.append('response_format', 'verbose_json');

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      return {
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        confidence: 0.95, // OpenAI doesn't provide confidence
      };
    } catch (error) {
      logger.error({ error: error.message }, 'OpenAI transcription failed');
      throw error;
    }
  }

  /**
   * Transcribe audio (main method)
   */
  async transcribe(audioBuffer, options = {}) {
    try {
      switch (this.provider) {
        case 'ollama':
          return await this._transcribeOllama(audioBuffer, options);
        case 'openai':
          return await this._transcribeOpenAI(audioBuffer, options);
        default:
          throw new Error(`Unknown Whisper provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error({ provider: this.provider, error: error.message }, 'Transcription failed');
      throw error;
    }
  }

  /**
   * Stream transcription (for real-time)
   * This is a simplified version - full implementation needs audio streaming
   */
  async *streamTranscribe(audioStream, options = {}) {
    // In production, this would process audio chunks in real-time
    // For now, we'll simulate streaming with chunks
    
    const chunks = [];
    let buffer = Buffer.alloc(0);

    for await (const chunk of audioStream) {
      buffer = Buffer.concat([buffer, chunk]);
      
      // Process when buffer reaches threshold (e.g., 1 second of audio)
      if (buffer.length >= 16000) { // Rough estimate for 1 second at 16kHz
        try {
          const result = await this.transcribe(buffer, options);
          yield {
            text: result.text,
            partial: true,
            timestamp: Date.now(),
          };
          buffer = Buffer.alloc(0); // Reset buffer
        } catch (error) {
          logger.error({ error: error.message }, 'Stream transcription chunk failed');
        }
      }
    }

    // Process remaining buffer
    if (buffer.length > 0) {
      try {
        const result = await this.transcribe(buffer, options);
        yield {
          text: result.text,
          partial: false,
          timestamp: Date.now(),
        };
      } catch (error) {
        logger.error({ error: error.message }, 'Final transcription chunk failed');
      }
    }
  }

  /**
   * Detect language (simple heuristic)
   */
  detectLanguage(text) {
    // Simple language detection (can be enhanced)
    const patterns = {
      en: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
      es: /\b(el|la|los|las|de|en|con|por|para)\b/gi,
      fr: /\b(le|la|les|de|en|avec|pour|par)\b/gi,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    return 'en'; // Default
  }
}

// Singleton instance
let whisperInstance = null;

function getWhisperService() {
  if (!whisperInstance) {
    whisperInstance = new WhisperService();
  }
  return whisperInstance;
}

module.exports = { WhisperService, getWhisperService };




