/**
 * Focus Mode (ZenTab) - One-tab immersive experience
 */

export interface FocusModeConfig {
  ambientSound?: string; // 'none' | 'nature' | 'rain' | 'ocean' | 'meditation'
  breathingOverlay?: boolean;
  timer?: number; // minutes
  notifications?: boolean;
}

export class FocusModeService {
  private active = false;
  private config: FocusModeConfig = {
    ambientSound: 'none',
    breathingOverlay: false,
    notifications: false,
  };

  /**
   * Enable focus mode
   */
  enable(config?: Partial<FocusModeConfig>): void {
    this.active = true;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Disable focus mode
   */
  disable(): void {
    this.active = false;
  }

  /**
   * Check if focus mode is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get current config
   */
  getConfig(): FocusModeConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<FocusModeConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let focusModeInstance: FocusModeService | null = null;

export function getFocusModeService(): FocusModeService {
  if (!focusModeInstance) {
    focusModeInstance = new FocusModeService();
  }
  return focusModeInstance;
}

