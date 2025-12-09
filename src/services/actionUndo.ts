/**
 * Action Undo/Rollback System
 * Tracks actions and provides undo capabilities
 */

import { ipc } from '../lib/ipc-typed';

export interface UndoableAction {
  id: string;
  action: string;
  actionType: string;
  timestamp: number;
  undoFn: () => Promise<void>;
  description: string;
}

class ActionUndoManager {
  private undoStack: UndoableAction[] = [];
  private maxStackSize = 50;

  /**
   * Register an action for potential undo
   */
  registerAction(action: UndoableAction): void {
    this.undoStack.push(action);
    // Keep only last N actions
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Get the last undoable action
   */
  getLastAction(): UndoableAction | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  /**
   * Undo the last action
   */
  async undoLast(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      await action.undoFn();
      return true;
    } catch (error) {
      console.error('[ActionUndo] Failed to undo action:', error);
      // Put it back if undo failed
      this.undoStack.push(action);
      return false;
    }
  }

  /**
   * Get all undoable actions
   */
  getAllActions(): UndoableAction[] {
    return [...this.undoStack];
  }

  /**
   * Clear undo stack
   */
  clear(): void {
    this.undoStack = [];
  }
}

export const actionUndoManager = new ActionUndoManager();

/**
 * Create undo function for OPEN action
 */
export async function createOpenUndo(url: string): Promise<() => Promise<void>> {
  return async () => {
    try {
      const tabs = await ipc.tabs.list();
      const tab = Array.isArray(tabs) ? tabs.find((t: any) => t.url === url && t.active) : null;
      if (tab?.id) {
        await ipc.tabs.close({ id: tab.id });
      }
    } catch (error) {
      console.warn('[ActionUndo] Failed to close tab:', error);
    }
  };
}

/**
 * Create undo function for NAVIGATE action
 */
export async function createNavigateUndo(
  tabId: string,
  previousUrl: string
): Promise<() => Promise<void>> {
  return async () => {
    try {
      await ipc.tabs.navigate(tabId, previousUrl);
    } catch (error) {
      console.warn('[ActionUndo] Failed to navigate back:', error);
    }
  };
}

/**
 * Create undo function for CLOSE_TAB action
 */
export async function createCloseTabUndo(
  tabId: string,
  url: string,
  _title: string
): Promise<() => Promise<void>> {
  return async () => {
    try {
      // Reopen the closed tab
      await ipc.tabs.create({ url, activate: true });
    } catch (error) {
      console.warn('[ActionUndo] Failed to reopen tab:', error);
    }
  };
}

/**
 * Create undo function for SWITCH_MODE action
 */
export async function createSwitchModeUndo(
  previousMode: string
): Promise<() => Promise<void>> {
  return async () => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('agent:switch-mode', {
            detail: { mode: previousMode.toLowerCase() },
          })
        );
      }
    } catch (error) {
      console.warn('[ActionUndo] Failed to switch mode back:', error);
    }
  };
}

