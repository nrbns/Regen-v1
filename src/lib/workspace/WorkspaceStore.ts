/**
 * Local Workspace Store - Saves AI outputs to disk
 * No sync, no cloud - purely local storage
 */

export interface WorkspaceItem {
  id: string;
  title: string;
  content: string;
  type: 'summary' | 'note' | 'analysis' | 'task_output';
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

class WorkspaceStore {
  private storageKey = 'regen:workspace:items';
  private items: WorkspaceItem[] = [];

  constructor() {
    this.load();
  }

  /**
   * Load items from localStorage
   */
  load(): WorkspaceItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
      this.items = [];
    }
    return this.items;
  }

  /**
   * Save items to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      console.error('Failed to save workspace:', error);
    }
  }

  /**
   * Get all items
   */
  getAll(): WorkspaceItem[] {
    return [...this.items];
  }

  /**
   * Get item by ID
   */
  get(id: string): WorkspaceItem | undefined {
    return this.items.find(item => item.id === id);
  }

  /**
   * Add new item
   */
  add(item: Omit<WorkspaceItem, 'id' | 'createdAt' | 'updatedAt'>): WorkspaceItem {
    const newItem: WorkspaceItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.items.push(newItem);
    this.save();
    return newItem;
  }

  /**
   * Update existing item
   */
  update(id: string, updates: Partial<WorkspaceItem>): WorkspaceItem | null {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;

    this.items[index] = {
      ...this.items[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.save();
    return this.items[index];
  }

  /**
   * Delete item
   */
  delete(id: string): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items = [];
    this.save();
  }

  /**
   * Get item count
   */
  getCount(): number {
    return this.items.length;
  }
}

// Singleton instance
export const workspaceStore = new WorkspaceStore();