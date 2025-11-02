/**
 * GameAgent - Mode-specific agent for Game mode
 */

export interface GameAchievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface GameEconomy {
  currency: string;
  items: Array<{ name: string; price: number; owned: number }>;
}

export class GameAgent {
  private achievements: Map<string, GameAchievement> = new Map();
  private economy: GameEconomy = { currency: 'coins', items: [] };

  /**
   * Track achievement progress
   */
  trackAchievement(achievementId: string, progress: number, maxProgress?: number): void {
    let achievement = this.achievements.get(achievementId);
    
    if (!achievement) {
      achievement = {
        id: achievementId,
        title: achievementId,
        description: '',
        progress,
        maxProgress,
      };
      this.achievements.set(achievementId, achievement);
    } else {
      achievement.progress = progress;
      if (maxProgress !== undefined) {
        achievement.maxProgress = maxProgress;
      }
      
      // Unlock if completed
      if (maxProgress && progress >= maxProgress && !achievement.unlockedAt) {
        achievement.unlockedAt = Date.now();
      }
    }
  }

  /**
   * Get all achievements
   */
  getAchievements(): GameAchievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Analyze in-game economy
   */
  analyzeEconomy(items: Array<{ name: string; price: number; owned: number }>): { totalValue: number; recommendations: string[] } {
    this.economy.items = items;
    
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.owned), 0);
    
    const recommendations: string[] = [];
    
    // Find expensive items
    const expensive = items.filter(i => i.price > 100 && i.owned === 0);
    if (expensive.length > 0) {
      recommendations.push(`Consider saving for: ${expensive[0].name}`);
    }

    return { totalValue, recommendations };
  }

  /**
   * Get economy stats
   */
  getEconomy(): GameEconomy {
    return { ...this.economy };
  }
}

