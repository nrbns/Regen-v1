/**
 * SPRINT 2: Reader-First Engine
 * Converts pages to low-data text-only format with TTS support
 */

export interface ReaderContent {
  title: string;
  text: string; // Plain text content
  html: string; // Simplified HTML
  readingTime: number; // Estimated reading time in minutes
  wordCount: number;
}

/**
 * Convert HTML to simplified text-only format
 */
export function extractReaderContent(html: string, _url?: string): ReaderContent {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove scripts, styles, and other non-content elements
  const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, aside, iframe, embed, object, video, audio, form, button, input, select, textarea');
  elementsToRemove.forEach(el => el.remove());

  // Extract title
  const title = doc.querySelector('h1, title')?.textContent?.trim() || 'Untitled';

  // Extract main content
  const article = doc.querySelector('article, main, [role="main"], .content, .post, .entry-content, #content');
  const contentElement = article || doc.body;

  // Convert to plain text, preserving paragraphs
  const text = contentElement.innerText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Create simplified HTML (remove images, preserve structure)
  const simplifiedHTML = contentElement.innerHTML
    .replace(/<img[^>]*>/gi, '')
    .replace(/<video[^>]*>.*?<\/video>/gi, '')
    .replace(/<audio[^>]*>.*?<\/audio>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/href="[^"]*"/gi, '') // Remove links but keep text
    .replace(/<a[^>]*>/gi, '')
    .replace(/<\/a>/gi, '');

  // Calculate reading time (average reading speed: 200 words per minute)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    title,
    text,
    html: `<h1>${title}</h1>${simplifiedHTML}`,
    readingTime,
    wordCount,
  };
}

/**
 * Text-to-Speech using Web Speech API
 */
export class ReaderTTS {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private currentText = '';
  private onEndCallback?: () => void;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Speak text
   */
  speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
  }): void {
    if (!this.synthesis) {
      console.warn('[ReaderTTS] Speech synthesis not available');
      return;
    }

    // Stop any ongoing speech
    this.stop();

    this.currentText = text;
    this.onEndCallback = options?.onEnd;
    this.isPlaying = true;

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = options?.rate || 1.0;
    this.utterance.pitch = options?.pitch || 1.0;
    this.utterance.volume = options?.volume ?? 1.0;

    if (options?.voice) {
      this.utterance.voice = options.voice;
    }

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.onEndCallback?.();
    };

    this.utterance.onerror = (error) => {
      console.error('[ReaderTTS] Speech synthesis error:', error);
      this.isPlaying = false;
      this.onEndCallback?.();
    };

    this.synthesis.speak(this.utterance);
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (this.synthesis && this.isPlaying) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (this.synthesis && this.isPlaying) {
      this.synthesis.resume();
    }
  }

  /**
   * Stop speech
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isPlaying = false;
    this.utterance = null;
  }

  /**
   * Check if currently playing
   */
  getPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }
}

// Singleton instance
let readerTTSInstance: ReaderTTS | null = null;

export function getReaderTTS(): ReaderTTS {
  if (!readerTTSInstance) {
    readerTTSInstance = new ReaderTTS();
  }
  return readerTTSInstance;
}

