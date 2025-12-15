/**
 * Adblocker Service
 * Main service for adblocker functionality
 */

import { getAdblockerEngine } from './engine';
import { getAdblockerStorage } from './storage';
import { DEFAULT_FILTER_LISTS } from './filterLists';
import { initializeInterceptors } from './requestInterceptor';
import type { AdblockerSettings, FilterList, BlockedRequest } from './types';

/**
 * Adblocker Service
 */
export class AdblockerService {
  private engine = getAdblockerEngine();
  private storage = getAdblockerStorage();
  private initialized = false;
  private settings: AdblockerSettings | null = null;

  /**
   * Initialize adblocker
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load settings
    this.settings = await this.storage.loadSettings();

    // Use default settings if none exist
    if (!this.settings) {
      this.settings = {
        enabled: true,
        filterLists: DEFAULT_FILTER_LISTS,
        allowAcceptableAds: false,
        blockedDomains: [],
        whitelistedDomains: [],
        customFilters: [],
      };
      await this.storage.saveSettings(this.settings);
    }

    // Initialize engine
    if (this.settings.enabled) {
      await this.engine.initialize(this.settings.filterLists, this.settings);

      // Initialize request interceptors
      initializeInterceptors();
    }

    this.initialized = true;
  }

  /**
   * Enable adblocker
   */
  async enable(): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    if (this.settings) {
      this.settings.enabled = true;
      await this.storage.saveSettings(this.settings);
      await this.engine.initialize(this.settings.filterLists, this.settings);
      initializeInterceptors();
    }
  }

  /**
   * Disable adblocker
   */
  async disable(): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    if (this.settings) {
      this.settings.enabled = false;
      await this.storage.saveSettings(this.settings);
    }
  }

  /**
   * Check if enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.enabled ?? false;
  }

  /**
   * Get settings
   */
  async getSettings(): Promise<AdblockerSettings> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings!;
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<AdblockerSettings>): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    this.settings = {
      ...this.settings!,
      ...updates,
    };

    await this.storage.saveSettings(this.settings);

    // Reinitialize if enabled
    if (this.settings.enabled) {
      await this.engine.initialize(this.settings.filterLists, this.settings);
    }
  }

  /**
   * Check if URL should be blocked
   */
  shouldBlock(url: string, type?: string): BlockedRequest {
    return this.engine.shouldBlock({ url, type });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return this.engine.getStats();
  }

  /**
   * Add whitelisted domain
   */
  async whitelistDomain(domain: string): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    const whitelisted = new Set(this.settings!.whitelistedDomains);
    whitelisted.add(domain);

    await this.updateSettings({
      whitelistedDomains: Array.from(whitelisted),
    });

    this.engine.addWhitelistedDomain(domain);
  }

  /**
   * Remove whitelisted domain
   */
  async unwhitelistDomain(domain: string): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    const whitelisted = this.settings!.whitelistedDomains.filter(d => d !== domain);

    await this.updateSettings({
      whitelistedDomains: whitelisted,
    });

    // Engine doesn't have remove method, need to reinitialize
    await this.engine.initialize(this.settings!.filterLists, this.settings!);
  }

  /**
   * Add blocked domain
   */
  async blockDomain(domain: string): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    const blocked = new Set(this.settings!.blockedDomains);
    blocked.add(domain);

    await this.updateSettings({
      blockedDomains: Array.from(blocked),
    });

    this.engine.addBlockedDomain(domain);
  }

  /**
   * Update filter list
   */
  async updateFilterList(listId: string, updates: Partial<FilterList>): Promise<void> {
    if (!this.settings) {
      await this.initialize();
    }

    const lists = this.settings!.filterLists.map(list =>
      list.id === listId ? { ...list, ...updates } : list
    );

    await this.updateSettings({
      filterLists: lists,
    });
  }
}

// Singleton instance
let serviceInstance: AdblockerService | null = null;

export function getAdblockerService(): AdblockerService {
  if (!serviceInstance) {
    serviceInstance = new AdblockerService();
  }
  return serviceInstance;
}
