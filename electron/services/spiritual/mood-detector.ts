/**
 * Mood-Based Themes - Detects user mood from typing rhythm
 */

export type Mood = 'calm' | 'focused' | 'energetic' | 'relaxed' | 'productive';

export interface MoodData {
  mood: Mood;
  confidence: number;
  detectedAt: number;
}

export class MoodDetector {
  private typingIntervals: number[] = [];
  private currentMood: Mood = 'focused';
  private readonly MAX_INTERVALS = 50;

  /**
   * Record typing event
   */
  recordTyping(): void {
    const now = Date.now();
    if (this.typingIntervals.length > 0) {
      const lastTime = this.typingIntervals[this.typingIntervals.length - 1];
      const interval = now - lastTime;
      this.typingIntervals.push(interval);
      
      // Keep only recent intervals
      if (this.typingIntervals.length > this.MAX_INTERVALS) {
        this.typingIntervals = this.typingIntervals.slice(-this.MAX_INTERVALS);
      }
    } else {
      this.typingIntervals.push(now);
    }

    // Detect mood based on typing patterns
    this.detectMood();
  }

  /**
   * Detect mood from typing rhythm
   */
  private detectMood(): void {
    if (this.typingIntervals.length < 10) return;

    // Calculate average typing speed
    const avgInterval = this.typingIntervals.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, this.typingIntervals.length);
    
    // Calculate variance
    const variance = this.typingIntervals.slice(-20).reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / Math.min(20, this.typingIntervals.length);

    // Mood detection logic
    if (avgInterval < 100 && variance < 500) {
      this.currentMood = 'energetic';
    } else if (avgInterval < 200 && variance < 1000) {
      this.currentMood = 'productive';
    } else if (avgInterval < 500 && variance < 2000) {
      this.currentMood = 'focused';
    } else if (avgInterval > 1000) {
      this.currentMood = 'calm';
    } else {
      this.currentMood = 'relaxed';
    }
  }

  /**
   * Get current mood
   */
  getMood(): MoodData {
    return {
      mood: this.currentMood,
      confidence: 0.7, // Simplified confidence calculation
      detectedAt: Date.now(),
    };
  }

  /**
   * Get theme colors for mood
   */
  getThemeColors(mood: Mood): { primary: string; secondary: string; background: string } {
    const themes: Record<Mood, { primary: string; secondary: string; background: string }> = {
      calm: { primary: '#60a5fa', secondary: '#a78bfa', background: '#1e293b' },
      focused: { primary: '#34d399', secondary: '#6ee7b7', background: '#0f172a' },
      energetic: { primary: '#f59e0b', secondary: '#fbbf24', background: '#1c1917' },
      relaxed: { primary: '#ec4899', secondary: '#f472b6', background: '#1f2937' },
      productive: { primary: '#3b82f6', secondary: '#60a5fa', background: '#111827' },
    };

    return themes[mood] || themes.focused;
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.typingIntervals = [];
    this.currentMood = 'focused';
  }
}

// Singleton instance
let moodDetectorInstance: MoodDetector | null = null;

export function getMoodDetector(): MoodDetector {
  if (!moodDetectorInstance) {
    moodDetectorInstance = new MoodDetector();
  }
  return moodDetectorInstance;
}

