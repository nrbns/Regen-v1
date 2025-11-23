/**
 * Agent Memory Layer - Tier 3 Pillar 1
 * Preference learning, task history, pattern recognition
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from '../../utils/logger';

export type MemoryType = 'preference' | 'fact' | 'task_history';

export type MemoryItem = {
  id: string;
  type: MemoryType;
  key: string;
  value: unknown;
  createdAt: number;
  lastUsedAt: number;
  usageCount: number;
};

export interface AgentMemory {
  get: (key: string) => unknown | null;
  set: (key: string, value: unknown) => void;
  remember: (type: MemoryType, key: string, value: unknown) => void;
  getPreferences: () => Record<string, unknown>;
  getTaskHistory: (limit?: number) => MemoryItem[];
  findPatterns: (type: MemoryType) => MemoryItem[];
}

type MemoryState = {
  items: MemoryItem[];
  add: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'lastUsedAt' | 'usageCount'>) => void;
  update: (id: string, updates: Partial<MemoryItem>) => void;
  getByKey: (key: string) => MemoryItem | undefined;
  getByType: (type: MemoryType) => MemoryItem[];
  clear: () => void;
};

const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      items: [],
      add: item => {
        const existing = get().items.find(i => i.key === item.key && i.type === item.type);
        if (existing) {
          // Update existing
          get().update(existing.id, {
            value: item.value,
            lastUsedAt: Date.now(),
            usageCount: existing.usageCount + 1,
          });
        } else {
          // Add new
          const newItem: MemoryItem = {
            ...item,
            id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            usageCount: 1,
          };
          set(state => ({ items: [...state.items, newItem] }));
        }
      },
      update: (id, updates) =>
        set(state => ({
          items: state.items.map(item => (item.id === id ? { ...item, ...updates } : item)),
        })),
      getByKey: key => {
        return get().items.find(item => item.key === key);
      },
      getByType: type => {
        return get().items.filter(item => item.type === type);
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'omnibrowser_agent_memory_v1',
    }
  )
);

/**
 * Agent Memory implementation
 */
export class AgentMemoryImpl implements AgentMemory {
  get(key: string): unknown | null {
    const item = useMemoryStore.getState().getByKey(key);
    if (item) {
      // Update last used
      useMemoryStore.getState().update(item.id, { lastUsedAt: Date.now() });
      return item.value;
    }
    return null;
  }

  set(key: string, value: unknown): void {
    useMemoryStore.getState().add({
      type: 'fact',
      key,
      value,
    });
  }

  remember(type: MemoryType, key: string, value: unknown): void {
    useMemoryStore.getState().add({
      type,
      key,
      value,
    });
    log.debug(`[AgentMemory] Remembered ${type}: ${key}`);
  }

  getPreferences(): Record<string, unknown> {
    const preferences = useMemoryStore.getState().getByType('preference');
    const result: Record<string, unknown> = {};
    preferences.forEach(item => {
      result[item.key] = item.value;
    });
    return result;
  }

  getTaskHistory(limit = 10): MemoryItem[] {
    const history = useMemoryStore
      .getState()
      .getByType('task_history')
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit);
    return history;
  }

  findPatterns(type: MemoryType): MemoryItem[] {
    const items = useMemoryStore.getState().getByType(type);
    // Return most frequently used items
    return items.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);
  }

  /**
   * Infer preferences from usage patterns
   */
  inferPreferences(): Record<string, unknown> {
    const patterns = this.findPatterns('task_history');
    const preferences: Record<string, unknown> = {};

    // Example: if user often researches AI + startups, suggest that preset
    const researchTopics = patterns
      .filter(p => typeof p.value === 'object' && p.value !== null && 'topic' in (p.value as any))
      .map(p => (p.value as any).topic);

    if (researchTopics.length > 0) {
      preferences['common_research_topics'] = researchTopics;
    }

    // Example: if user prefers bullet summaries
    const summaryFormats = patterns
      .filter(p => typeof p.value === 'object' && p.value !== null && 'format' in (p.value as any))
      .map(p => (p.value as any).format);

    if (summaryFormats.length > 0) {
      const mostCommon = summaryFormats[0];
      preferences['preferred_summary_format'] = mostCommon;
    }

    return preferences;
  }
}

// Singleton instance
export const agentMemory = new AgentMemoryImpl();
