/**
 * Autofill Storage
 * Persistent storage for autofill data
 */

import type { AutofillData } from './types';

export class AutofillStorage {
  private readonly STORAGE_KEY = 'regen_autofill';
  private readonly PROFILES_KEY = 'regen_autofill_profiles';
  private readonly DEFAULT_PROFILE_KEY = 'regen_autofill_default';

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    // No-op for localStorage, always available
  }

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
    localStorage.removeItem(this.PROFILES_KEY);
    localStorage.removeItem(this.DEFAULT_PROFILE_KEY);
  }

  /**
   * Get profile by ID
   */
  async getProfile(profileId: string): Promise<any | null> {
    try {
      const profiles = await this.getAllProfiles();
      return profiles.find((p: any) => p.id === profileId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Get default profile
   */
  async getDefaultProfile(): Promise<any | null> {
    try {
      const defaultId = localStorage.getItem(this.DEFAULT_PROFILE_KEY);
      if (!defaultId) return null;
      return await this.getProfile(defaultId);
    } catch {
      return null;
    }
  }

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<any[]> {
    try {
      const data = localStorage.getItem(this.PROFILES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save profile
   */
  async saveProfile(profile: any): Promise<void> {
    const profiles = await this.getAllProfiles();
    const index = profiles.findIndex((p: any) => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const profiles = await this.getAllProfiles();
    const filtered = profiles.filter((p: any) => p.id !== profileId);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(filtered));

    // Clear default if deleted
    const defaultId = localStorage.getItem(this.DEFAULT_PROFILE_KEY);
    if (defaultId === profileId) {
      localStorage.removeItem(this.DEFAULT_PROFILE_KEY);
    }
  }

  /**
   * Set default profile
   */
  async setDefaultProfile(profileId: string): Promise<void> {
    localStorage.setItem(this.DEFAULT_PROFILE_KEY, profileId);
  }
}

let storage: AutofillStorage | null = null;

export function getAutofillStorage(): AutofillStorage {
  if (!storage) {
    storage = new AutofillStorage();
  }
  return storage;
}
