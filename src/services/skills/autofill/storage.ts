/**
 * Autofill Storage
 * Persistent storage for autofill data
 */

import type { AutofillData } from './types';

export class AutofillStorage {
  private readonly STORAGE_KEY = 'regen_autofill';

  /**
   * Load autofill data
   */
  async loadData(): Promise<AutofillData[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save autofill data
   */
  async saveData(data: AutofillData[]): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Clear all data
   */
  async clearData(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

let storage: AutofillStorage | null = null;

export function getAutofillStorage(): AutofillStorage {
  if (!storage) {
    storage = new AutofillStorage();
  }
  return storage;
}
