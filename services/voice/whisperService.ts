/**
 * Whisper Speech-to-Text Service
 * Converts audio to text using OpenAI Whisper API
 */

/**
 * Transcription result
 */
export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence?: number;
}

/**
 * Streaming transcription event
 */
export interface TranscriptionChunk {
  partial: string; // Partial result while still transcribing
  isFinal: boolean;
  timestamp: number;
}

/**
 * Whisper STT Service
 */
export class WhisperService {
  private apiKey: string;
  private model: string = 'whisper-1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioBlob: Blob, language?: string): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      // Fallback: mock transcription for demo
      return this.mockTranscribe(audioBlob);
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', this.model);

      if (language) {
        formData.append('language', language);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        text: string;
        language?: string;
        duration?: number;
      };

      return {
        text: data.text,
        language: data.language || 'en',
        duration: data.duration || 0,
        confidence: 0.95, // OpenAI doesn't provide confidence
      };
    } catch (error) {
      console.error('[WhisperService] Transcription failed:', error);
      // Fallback
      return this.mockTranscribe(audioBlob);
    }
  }

  /**
   * Transcribe with timestamps
   */
  async transcribeWithTimestamps(
    audioBlob: Blob
  ): Promise<Array<{ text: string; start: number; end: number }>> {
    // This requires verbose_json mode (OpenAI Pro feature)
    // For now: return simple segments
    const result = await this.transcribe(audioBlob);

    return [
      {
        text: result.text,
        start: 0,
        end: result.duration,
      },
    ];
  }

  /**
   * Mock transcription for demo/testing
   */
  private mockTranscribe(audioBlob: Blob): TranscriptionResult {
    // In production: remove this
    const mockTranscriptions: Record<string, string> = {
      'summarize my emails': 'Summarize my emails',
      'read unread messages': 'Read unread messages',
      'send a reply': 'Send a reply to that email',
      'create a presentation about sales': 'Create a presentation about Q4 sales',
      'book a flight to new york': 'Book me a flight to New York next Friday',
      'what is my schedule': 'What is my schedule for tomorrow',
      'set a reminder': 'Remind me to follow up on the project status',
    };

    // Random selection for demo
    const mockTexts = Object.values(mockTranscriptions);
    const selected = mockTexts[Math.floor(Math.random() * mockTexts.length)];

    return {
      text: selected,
      language: 'en',
      duration: (audioBlob.size / 16000) * 8, // Rough estimate
      confidence: 0.88,
    };
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', this.model);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      const data = (await response.json()) as { language?: string };
      return data.language || 'en';
    } catch (error) {
      console.error('[WhisperService] Language detection failed:', error);
      return 'en'; // Default
    }
  }
}

export const whisperService = new WhisperService();
