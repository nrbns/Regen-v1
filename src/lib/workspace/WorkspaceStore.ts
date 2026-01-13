/**
 * Local Workspace Store - Saves AI outputs to disk
 * FIX: Enhanced with export/import functionality
 * Uses localStorage for persistence (file-based persistence for Tauri mode - TODO: enable when backend ready)
 * No sync, no cloud - purely local storage
 */

// Note: File-based persistence imports are commented out until Tauri backend is ready
// import { isTauriRuntime } from '../env';

export interface WorkspaceItem {
  id: string;
  title: string;
  content: string;
  type: 'summary' | 'note' | 'analysis' | 'task_output' | 'search' | 'task_result';
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

const WORKSPACE_VERSION = '1.0';

class WorkspaceStore {
  private storageKey = 'regen:workspace:items';
  private items: WorkspaceItem[] = [];
  private filePath: string | null = null; // For Tauri file-based persistence
  private eventTarget: EventTarget;

  constructor() {
    this.eventTarget = new EventTarget();
    this.load();
    this.initFilePersistence();
  }

  /**
   * REAL-TIME LAUNCH: Event-driven workspace updates
   * Subscribe to workspace change events
   */
  on(event: 'change', handler: () => void): () => void {
    this.eventTarget.addEventListener(event, handler);
    return () => this.eventTarget.removeEventListener(event, handler);
  }

  /**
   * Emit workspace change event
   */
  private emitChange(): void {
    this.eventTarget.dispatchEvent(new Event('change'));
  }

  /**
   * Initialize file-based persistence for Tauri mode
   * FIX: Uses OS file system for Tauri, localStorage for web
   * Note: File-based persistence is optional - falls back to localStorage if unavailable
   */
  private async initFilePersistence(): Promise<void> {
    // For now, use localStorage in all modes
    // File-based persistence requires Tauri backend work and proper module resolution
    // TODO: Enable file-based persistence when Tauri backend is ready
    this.loadFromLocalStorage();
    
    // Future implementation (when Tauri backend ready):
    // if (isTauriRuntime()) {
    //   try {
    //     // In Tauri mode, use OS file system
    //     const { appDataDir } = await import('@tauri-apps/api/path');
    //     const { exists, createDir, readTextFile, writeTextFile } = await import('@tauri-apps/api/fs');
    //     // ... implementation
    //   } catch (error) {
    //     // Fallback to localStorage
    //     this.loadFromLocalStorage();
    //   }
    // } else {
    //   this.loadFromLocalStorage();
    // }
  }

  /**
   * Load items from localStorage (fallback/migration)
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load workspace from localStorage:', error);
      this.items = [];
    }
  }

  /**
   * Load items from storage (file or localStorage)
   */
  load(): WorkspaceItem[] {
    if (this.filePath) {
      // File persistence is async, handled in initFilePersistence
      return this.items;
    } else {
      this.loadFromLocalStorage();
      return this.items;
    }
  }

  /**
   * Save items to file (Tauri mode)
   * Note: Currently disabled - file-based persistence requires Tauri backend work
   * TODO: Enable when Tauri backend is ready
   */
  private async saveToFile(): Promise<void> {
    if (!this.filePath) return;

    // For now, always fall back to localStorage
    // File-based persistence will be enabled when Tauri backend is ready
    this.saveToLocalStorage();
    
    // Future implementation:
    // try {
    //   const { writeTextFile } = await import('@tauri-apps/api/fs');
    //   const data = {
    //     version: WORKSPACE_VERSION,
    //     items: this.items,
    //     savedAt: Date.now(),
    //   };
    //   await writeTextFile(this.filePath, JSON.stringify(data, null, 2));
    // } catch (error) {
    //   this.saveToLocalStorage();
    // }
  }

  /**
   * Save items to localStorage (web mode or fallback)
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      console.error('Failed to save workspace to localStorage:', error);
      // If storage is full, try to clear old items
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[WorkspaceStore] Storage full, clearing oldest items');
        this.items = this.items.slice(-100); // Keep only last 100 items
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        } catch (retryError) {
          console.error('[WorkspaceStore] Failed to save after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Save items to storage (file or localStorage)
   * FIX: Now async-aware for future file persistence
   * Currently uses localStorage only (file persistence disabled until Tauri backend ready)
   */
  private async save(): Promise<void> {
    // For now, always use localStorage
    // When file-based persistence is enabled, this will check this.filePath
    this.saveToLocalStorage();
    
    // Future: if (this.filePath) { await this.saveToFile(); } else { this.saveToLocalStorage(); }
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
   * FIX: Now uses async save (fire-and-forget)
   */
  add(item: Omit<WorkspaceItem, 'id' | 'createdAt' | 'updatedAt'>): WorkspaceItem {
    const newItem: WorkspaceItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.items.push(newItem);
    // REAL-TIME LAUNCH: Emit change event
    this.emitChange();
    // Fire-and-forget save (async but don't await)
    this.save().catch((error) => {
      console.error('[WorkspaceStore] Failed to save after add:', error);
    });
    return newItem;
  }

  /**
   * Update existing item
   * FIX: Uses async save (fire-and-forget)
   */
  update(id: string, updates: Partial<WorkspaceItem>): WorkspaceItem | null {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;

    this.items[index] = {
      ...this.items[index],
      ...updates,
      updatedAt: Date.now(),
    };
    // Fire-and-forget save
    this.save().catch((error) => {
      console.error('[WorkspaceStore] Failed to save after update:', error);
    });
    return this.items[index];
  }

  /**
   * Delete item
   * FIX: Uses async save (fire-and-forget)
   */
  delete(id: string): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    // REAL-TIME LAUNCH: Emit change event
    this.emitChange();
    // Fire-and-forget save
    this.save().catch((error) => {
      console.error('[WorkspaceStore] Failed to save after delete:', error);
    });
    return true;
  }

  /**
   * Clear all items
   * FIX: Uses async save (fire-and-forget)
   */
  clear(): void {
    this.items = [];
    // REAL-TIME LAUNCH: Emit change event
    this.emitChange();
    // Fire-and-forget save
    this.save().catch((error) => {
      console.error('[WorkspaceStore] Failed to save after clear:', error);
    });
  }

  /**
   * Get item count
   */
  getCount(): number {
    return this.items.length;
  }

  /**
   * FIX: Export workspace to JSON (for backup/transfer)
   */
  exportToJSON(): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      itemCount: this.items.length,
      items: this.items,
    }, null, 2);
  }

  /**
   * FIX: Export workspace to Markdown (human-readable)
   */
  exportToMarkdown(): string {
    let markdown = '# Regen Workspace Export\n\n';
    markdown += `**Exported:** ${new Date().toISOString()}\n`;
    markdown += `**Items:** ${this.items.length}\n\n`;
    markdown += '---\n\n';

    for (const item of this.items) {
      markdown += `## ${item.title}\n\n`;
      markdown += `**Type:** ${item.type}\n`;
      markdown += `**Created:** ${new Date(item.createdAt).toISOString()}\n`;
      if (item.metadata) {
        markdown += `**Metadata:** ${JSON.stringify(item.metadata, null, 2)}\n`;
      }
      markdown += `\n${item.content}\n\n`;
      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * FIX: Import workspace from JSON (for restore/transfer)
   */
  importFromJSON(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);
      if (!data.items || !Array.isArray(data.items)) {
        return { success: false, imported: 0, errors: ['Invalid workspace format: missing items array'] };
      }

      // Validate and import each item
      for (const item of data.items) {
        try {
          if (!item.title || !item.content || !item.type) {
            errors.push(`Invalid item: missing required fields (title, content, type)`);
            continue;
          }

          // Import item (will generate new ID)
          this.add({
            title: item.title,
            content: item.content,
            type: item.type as WorkspaceItem['type'],
            metadata: item.metadata,
          });
          imported++;
        } catch (error) {
          errors.push(`Failed to import item "${item.title || 'unknown'}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * FIX: Get workspace storage size (bytes)
   */
  getStorageSize(): number {
    try {
      return new Blob([JSON.stringify(this.items)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * FIX: Get workspace statistics
   */
  getStatistics(): {
    totalItems: number;
    byType: Record<string, number>;
    totalSize: number;
    totalSizeMB: number;
    oldestItem?: number;
    newestItem?: number;
  } {
    const stats = {
      totalItems: this.items.length,
      byType: {} as Record<string, number>,
      totalSize: this.getStorageSize(),
      totalSizeMB: 0,
      oldestItem: undefined as number | undefined,
      newestItem: undefined as number | undefined,
    };

    stats.totalSizeMB = Math.round((stats.totalSize / (1024 * 1024)) * 100) / 100;

    for (const item of this.items) {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;

      if (!stats.oldestItem || item.createdAt < stats.oldestItem) {
        stats.oldestItem = item.createdAt;
      }
      if (!stats.newestItem || item.createdAt > stats.newestItem) {
        stats.newestItem = item.createdAt;
      }
    }

    return stats;
  }
}

// Singleton instance
export const workspaceStore = new WorkspaceStore();