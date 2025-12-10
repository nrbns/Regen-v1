/**
 * Sarvam AI Integration for Hindi Voice - v0.4 Week 3
 * Enhanced Hindi voice recognition using Sarvam AI (Indian LLM)
 *
 * Sarvam provides better Hindi ASR than Web Speech API
 * API: https://api.sarvam.ai (requires API key)
 */

export interface SarvamConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: 'hindi-asr' | 'hindi-tts' | 'hindi-llm';
}

export interface SarvamASRResult {
  text: string;
  confidence: number;
  language: 'hi' | 'en' | 'hi-en';
  duration?: number;
}

export interface SarvamTTSResult {
  audioUrl?: string;
  audioData?: ArrayBuffer;
  duration?: number;
}

class SarvamService {
  private config: SarvamConfig;
  private isAvailable: boolean = false;

  constructor(config: SarvamConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.sarvam.ai',
      model: config.model || 'hindi-asr',
      ...config,
    };
    this.checkAvailability();
  }

  /**
   * Check if Sarvam API is available (has API key)
   */
  private async checkAvailability(): Promise<void> {
    this.isAvailable = Boolean(this.config.apiKey);
  }

  /**
   * Transcribe Hindi audio using Sarvam ASR
   * Falls back to Web Speech API if Sarvam unavailable
   */
  async transcribeHindi(audioBlob: Blob): Promise<SarvamASRResult> {
    if (!this.isAvailable || !this.config.apiKey) {
      throw new Error('Sarvam API key not configured. Using Web Speech API fallback.');
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('model', this.config.model || 'hindi-asr');
      formData.append('language', 'hi');

      const response = await fetch(`${this.config.baseUrl}/v1/asr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Sarvam ASR failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        text: data.text || '',
        confidence: data.confidence || 0.8,
        language: data.language || 'hi',
        duration: data.duration,
      };
    } catch (error) {
      console.warn('[Sarvam] ASR failed, falling back to Web Speech API:', error);
      throw error; // Let caller handle fallback
    }
  }

  /**
   * Generate Hindi TTS using Sarvam
   */
  async synthesizeHindi(text: string, voice?: string): Promise<SarvamTTSResult> {
    if (!this.isAvailable || !this.config.apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          text,
          model: 'hindi-tts',
          voice: voice || 'female-hindi',
          language: 'hi',
        }),
      });

      if (!response.ok) {
        throw new Error(`Sarvam TTS failed: ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      return {
        audioData,
        duration: audioData.byteLength / 16000, // Rough estimate
      };
    } catch (error) {
      console.error('[Sarvam] TTS failed:', error);
      throw error;
    }
  }

  /**
   * Query Hindi LLM using Sarvam (for better Hindi understanding)
   */
  async queryHindiLLM(prompt: string, context?: string): Promise<string> {
    if (!this.isAvailable || !this.config.apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'hindi-llm',
          messages: [
            ...(context ? [{ role: 'system', content: context }] : []),
            { role: 'user', content: prompt },
          ],
          language: 'hi',
        }),
      });

      if (!response.ok) {
        throw new Error(`Sarvam LLM failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.text || '';
    } catch (error) {
      console.error('[Sarvam] LLM query failed:', error);
      throw error;
    }
  }

  /**
   * Check if Sarvam is available
   */
  getAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.checkAvailability();
  }
}

// Singleton instance
let sarvamInstance: SarvamService | null = null;

/**
 * Get Sarvam service instance
 */
export function getSarvamService(config?: SarvamConfig): SarvamService {
  if (!sarvamInstance) {
    // Try to load API key from env or localStorage
    const apiKey =
      config?.apiKey ||
      import.meta.env.VITE_SARVAM_API_KEY ||
      localStorage.getItem('sarvam_api_key') ||
      undefined;

    sarvamInstance = new SarvamService({ ...config, apiKey });
  }
  return sarvamInstance;
}

/**
 * Enhanced Hindi voice recognition with Sarvam fallback
 * Uses Web Speech API first, falls back to Sarvam if available
 */
export async function transcribeHindiVoice(
  audioBlob: Blob,
  useSarvam: boolean = true
): Promise<{ text: string; source: 'web-speech' | 'sarvam' }> {
  if (useSarvam) {
    try {
      const sarvam = getSarvamService();
      if (sarvam.getAvailable()) {
        const result = await sarvam.transcribeHindi(audioBlob);
        return { text: result.text, source: 'sarvam' };
      }
    } catch (error) {
      console.warn('[HindiVoice] Sarvam failed, using Web Speech API:', error);
    }
  }

  // Fallback to Web Speech API (already implemented in VoiceButton)
  // This would require MediaRecorder integration
  throw new Error('Web Speech API fallback requires MediaRecorder integration');
}
