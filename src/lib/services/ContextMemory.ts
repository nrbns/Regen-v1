/**
 * Context Memory Service
 * Remembers user preferences and learns from past actions
 * Provides personalized suggestions based on history
 */

import { workspaceStore } from '../workspace/WorkspaceStore';
import { taskRunner, type TaskExecution } from '../tasks/TaskRunner';

export interface UserPreference {
  preferredActions: string[]; // Task IDs user frequently uses
  preferredTopics: string[]; // Topics user is interested in
  actionPatterns: Map<string, number>; // Task ID -> frequency
  topicPatterns: Map<string, number>; // Topic -> frequency
}

export interface ContextMemory {
  preferences: UserPreference;
  lastActions: Array<{
    taskId: string;
    url: string;
    timestamp: number;
    success: boolean;
  }>;
  learnedPatterns: Array<{
    condition: string; // e.g., "youtube.com + video content"
    suggestedAction: string; // Task ID
    confidence: number;
  }>;
}

class ContextMemoryService {
  private memory: ContextMemory;
  private readonly STORAGE_KEY = 'regen:context:memory';
  private readonly MAX_ACTIONS = 100;

  constructor() {
    this.memory = this.loadMemory();
    this.analyzeHistory();
  }

  /**
   * Record an action for learning
   */
  recordAction(taskId: string, url: string, success: boolean): void {
    this.memory.lastActions.push({
      taskId,
      url,
      timestamp: Date.now(),
      success,
    });

    // Keep only recent actions
    if (this.memory.lastActions.length > this.MAX_ACTIONS) {
      this.memory.lastActions = this.memory.lastActions.slice(-this.MAX_ACTIONS);
    }

    // Update preferences
    const count = this.memory.preferences.actionPatterns.get(taskId) || 0;
    this.memory.preferences.actionPatterns.set(taskId, count + 1);

    // Update preferred actions (top 5)
    this.memory.preferences.preferredActions = Array.from(
      this.memory.preferences.actionPatterns.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([taskId]) => taskId);

    this.saveMemory();
  }

  /**
   * Record topic interest
   */
  recordTopicInterest(topic: string): void {
    const count = this.memory.preferences.topicPatterns.get(topic) || 0;
    this.memory.preferences.topicPatterns.set(topic, count + 1);

    // Update preferred topics (top 5)
    this.memory.preferences.preferredTopics = Array.from(
      this.memory.preferences.topicPatterns.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    this.saveMemory();
  }

  /**
   * Get personalized suggestions based on history
   */
  getPersonalizedSuggestions(url: string, detectedTopic?: string): string[] {
    const suggestions: string[] = [];

    // Suggest based on preferred actions
    suggestions.push(...this.memory.preferences.preferredActions.slice(0, 2));

    // Suggest based on learned patterns
    for (const pattern of this.memory.learnedPatterns) {
      if (pattern.condition.includes(url) || (detectedTopic && pattern.condition.includes(detectedTopic))) {
        if (pattern.confidence > 0.7) {
          suggestions.push(pattern.suggestedAction);
        }
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(suggestions));
  }

  /**
   * Analyze history to learn patterns
   */
  private analyzeHistory(): void {
    // Analyze task executions
    const executions = taskRunner.getExecutions(50);
    const urlTaskMap = new Map<string, Map<string, number>>(); // URL -> Task ID -> Count

    for (const exec of executions) {
      // Extract URL from execution context (if available)
      // For now, we'll use a simplified approach
      const url = 'current_tab'; // Would be extracted from execution context
      if (!urlTaskMap.has(url)) {
        urlTaskMap.set(url, new Map());
      }
      const taskMap = urlTaskMap.get(url)!;
      taskMap.set(exec.taskId, (taskMap.get(exec.taskId) || 0) + 1);
    }

    // Generate learned patterns
    this.memory.learnedPatterns = [];
    for (const [url, taskMap] of urlTaskMap.entries()) {
      const mostCommonTask = Array.from(taskMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (mostCommonTask && mostCommonTask[1] >= 3) {
        // Pattern: Used this task 3+ times for this URL/context
        this.memory.learnedPatterns.push({
          condition: url,
          suggestedAction: mostCommonTask[0],
          confidence: Math.min(0.9, mostCommonTask[1] / 10), // Cap at 0.9
        });
      }
    }

    this.saveMemory();
  }

  /**
   * Get memory statistics
   */
  getStatistics(): {
    totalActions: number;
    preferredActions: string[];
    preferredTopics: string[];
    learnedPatterns: number;
  } {
    return {
      totalActions: this.memory.lastActions.length,
      preferredActions: this.memory.preferences.preferredActions,
      preferredTopics: this.memory.preferences.preferredTopics,
      learnedPatterns: this.memory.learnedPatterns.length,
    };
  }

  /**
   * Clear memory
   */
  clearMemory(): void {
    this.memory = {
      preferences: {
        preferredActions: [],
        preferredTopics: [],
        actionPatterns: new Map(),
        topicPatterns: new Map(),
      },
      lastActions: [],
      learnedPatterns: [],
    };
    this.saveMemory();
  }

  /**
   * Load memory from storage
   */
  private loadMemory(): ContextMemory {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore Maps from arrays
        return {
          ...parsed,
          preferences: {
            ...parsed.preferences,
            actionPatterns: new Map(parsed.preferences.actionPatterns || []),
            topicPatterns: new Map(parsed.preferences.topicPatterns || []),
          },
        };
      }
    } catch (error) {
      console.warn('[ContextMemory] Failed to load memory:', error);
    }

    return {
      preferences: {
        preferredActions: [],
        preferredTopics: [],
        actionPatterns: new Map(),
        topicPatterns: new Map(),
      },
      lastActions: [],
      learnedPatterns: [],
    };
  }

  /**
   * Save memory to storage
   */
  private saveMemory(): void {
    try {
      // Convert Maps to arrays for JSON serialization
      const serializable = {
        ...this.memory,
        preferences: {
          ...this.memory.preferences,
          actionPatterns: Array.from(this.memory.preferences.actionPatterns.entries()),
          topicPatterns: Array.from(this.memory.preferences.topicPatterns.entries()),
        },
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.warn('[ContextMemory] Failed to save memory:', error);
    }
  }
}

export const contextMemory = new ContextMemoryService();
