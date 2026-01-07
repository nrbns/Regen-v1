/**
 * Text-to-Speech Service
 * Converts text to audio using TTS providers
 */

/**
 * TTS options
 */
export interface TTSOptions {
  voice: string; // e.g., 'en-US-Neural2-C' (Google), 'nova' (Eleven Labs)
  speed: number; // 0.5-2.0
  pitch: number; // -20 to 20
  language: string;
}

/**
 * TTS Result
 */
export interface TTSResult {
  audioBlob: Blob;
  mimeType: string;
  duration: number;
}

/**
 * Text-to-Speech service
 */
export class TTSService {
  private apiKey: string;
  private provider: 'google' | 'elevenlabs' | 'azure' | 'browser';
  private options: TTSOptions;

  constructor(
    provider: 'google' | 'elevenlabs' | 'azure' | 'browser' = 'browser',
    apiKey?: string,
    options?: Partial<TTSOptions>
  ) {
    this.provider = provider;
    this.apiKey = apiKey || process.env.TTS_API_KEY || '';
    this.options = {
      voice: 'en-US',
      speed: 1.0,
      pitch: 0,
      language: 'en',
      ...options,
    };
  }

  /**
   * Convert text to speech
   */
  async synthesize(text: string): Promise<TTSResult> {
    switch (this.provider) {
      case 'google':
        return this.synthesizeWithGoogle(text);
      case 'elevenlabs':
        return this.synthesizeWithElevenLabs(text);
      case 'azure':
        return this.synthesizeWithAzure(text);
      case 'browser':
        return this.synthesizeWithBrowser(text);
      default:
        throw new Error(`Unsupported TTS provider: ${this.provider}`);
    }
  }

  /**
   * Google Cloud TTS
   */
  private async synthesizeWithGoogle(text: string): Promise<TTSResult> {
    try {
      const response = await fetch(
        'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + this.apiKey,
        {
          method: 'POST',
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: this.options.language,
              name: this.options.voice,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: this.options.pitch,
              speakingRate: this.options.speed,
            },
          }),
        }
      );

      const data = (await response.json()) as {
        audioContent?: string;
      };

      const binaryString = atob(data.audioContent || '');
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return {
        audioBlob: new Blob([bytes], { type: 'audio/mp3' }),
        mimeType: 'audio/mp3',
        duration: (text.length / 50) * 1000, // Rough estimate
      };
    } catch (error) {
      console.error('[TTSService] Google synthesis failed:', error);
      return this.synthesizeWithBrowser(text);
    }
  }

  /**
   * ElevenLabs TTS
   */
  private async synthesizeWithElevenLabs(text: string): Promise<TTSResult> {
    try {
      const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Bella voice

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      const audioBlob = await response.blob();

      return {
        audioBlob,
        mimeType: 'audio/mpeg',
        duration: (text.length / 50) * 1000,
      };
    } catch (error) {
      console.error('[TTSService] ElevenLabs synthesis failed:', error);
      return this.synthesizeWithBrowser(text);
    }
  }

  /**
   * Azure TTS
   */
  private async synthesizeWithAzure(text: string): Promise<TTSResult> {
    try {
      const region = process.env.AZURE_REGION || 'eastus';
      const response = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
          },
          body: `<speak version="1.0" xml:lang="${this.options.language}">
            <voice name="${this.options.voice}">
              <prosody rate="${this.options.speed}" pitch="${this.options.pitch}">
                ${text}
              </prosody>
            </voice>
          </speak>`,
        }
      );

      const audioBlob = await response.blob();

      return {
        audioBlob,
        mimeType: 'audio/mpeg',
        duration: (text.length / 50) * 1000,
      };
    } catch (error) {
      console.error('[TTSService] Azure synthesis failed:', error);
      return this.synthesizeWithBrowser(text);
    }
  }

  /**
   * Browser Web Speech API (fallback)
   */
  private async synthesizeWithBrowser(text: string): Promise<TTSResult> {
    return new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.options.language;
      utterance.rate = this.options.speed;
      utterance.pitch = this.options.pitch / 20; // Normalize
      utterance.volume = 1.0;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const mediaStreamDestination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = event => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });

        resolve({
          audioBlob,
          mimeType: 'audio/wav',
          duration: (text.length / 50) * 1000,
        });
      };

      utterance.onend = () => {
        mediaRecorder.stop();
      };

      mediaRecorder.start();
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Play audio
   */
  async play(audioBlob: Blob): Promise<void> {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch(reject);
    });
  }
}

export const ttsService = new TTSService('browser');
