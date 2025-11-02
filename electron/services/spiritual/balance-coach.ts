/**
 * Digital Balance Coach - Reminds to rest, stretch, hydrate
 */

export interface BalanceReminder {
  type: 'rest' | 'stretch' | 'hydrate' | 'eye_break';
  message: string;
  interval: number; // minutes
}

export class BalanceCoach {
  private reminders: Map<string, NodeJS.Timeout> = new Map();
  private lastReminderTime: Map<string, number> = new Map();

  /**
   * Start balance reminders
   */
  startReminders(intervals: { rest?: number; stretch?: number; hydrate?: number; eyeBreak?: number }): void {
    this.stopAllReminders();

    if (intervals.rest) {
      this.startReminder('rest', intervals.rest, 'Take a break! You\'ve been browsing for a while.');
    }
    if (intervals.stretch) {
      this.startReminder('stretch', intervals.stretch, 'Time to stretch! Move your body.');
    }
    if (intervals.hydrate) {
      this.startReminder('hydrate', intervals.hydrate, 'Stay hydrated! Drink some water.');
    }
    if (intervals.eyeBreak) {
      this.startReminder('eye_break', intervals.eyeBreak, 'Rest your eyes! Look away from the screen.');
    }
  }

  /**
   * Start a reminder
   */
  private startReminder(type: string, intervalMinutes: number, message: string): void {
    const interval = setInterval(() => {
      const lastTime = this.lastReminderTime.get(type) || 0;
      const now = Date.now();
      
      // Only show if enough time has passed
      if (now - lastTime >= intervalMinutes * 60 * 1000) {
        this.showReminder({ type: type as BalanceReminder['type'], message, interval: intervalMinutes });
        this.lastReminderTime.set(type, now);
      }
    }, intervalMinutes * 60 * 1000);

    this.reminders.set(type, interval);
  }

  /**
   * Show reminder (would trigger UI notification)
   */
  private showReminder(reminder: BalanceReminder): void {
    // Emit event that UI can listen to
    console.log('[BalanceCoach]', reminder.message);
    // In production, this would emit an IPC event to the renderer
  }

  /**
   * Stop all reminders
   */
  stopAllReminders(): void {
    for (const [type, timer] of this.reminders.entries()) {
      clearInterval(timer);
      this.reminders.delete(type);
    }
  }

  /**
   * Stop specific reminder
   */
  stopReminder(type: string): void {
    const timer = this.reminders.get(type);
    if (timer) {
      clearInterval(timer);
      this.reminders.delete(type);
    }
  }
}

// Singleton instance
let balanceCoachInstance: BalanceCoach | null = null;

export function getBalanceCoach(): BalanceCoach {
  if (!balanceCoachInstance) {
    balanceCoachInstance = new BalanceCoach();
  }
  return balanceCoachInstance;
}

