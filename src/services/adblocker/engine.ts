/**
 * Adblocker Engine
 * Core blocking logic for ads and trackers
 */

import type { FilterList, BlockedRequest, AdblockerSettings } from './types';
import { parseFilterList } from './filterLists';

/**
 * Simple adblocker engine
 * Uses pattern matching and domain blocking
 */
export class AdblockerEngine {
  private filters: Set<string> = new Set();
  private blockedDomains: Set<string> = new Set();
  private whitelistedDomains: Set<string> = new Set();
  private customFilters: string[] = [];
  private stats = {
    totalBlocked: 0,
    blockedByType: {} as Record<string, number>,
    blockedByList: {} as Record<string, number>,
  };

  /**
   * Initialize engine with filter lists
   */
  async initialize(filterLists: FilterList[], settings?: Partial<AdblockerSettings>): Promise<void> {
    this.filters.clear();
    
    // Load enabled filter lists
    const enabledLists = filterLists.filter(list => list.enabled);
    const filterContents: string[] = [];

    for (const list of enabledLists) {
      try {
        const response = await fetch(list.url);
        if (response.ok) {
          const content = await response.text();
          filterContents.push(content);
          const parsed = parseFilterList(content);
          parsed.forEach(filter => this.filters.add(filter));
          
          this.stats.blockedByList[list.id] = 0;
        }
      } catch (error) {
        console.error(`Failed to load filter list ${list.name}:`, error);
      }
    }

    // Add custom filters
    if (settings?.customFilters) {
      settings.customFilters.forEach(filter => {
        this.filters.add(filter);
      });
    }

    // Add blocked domains
    if (settings?.blockedDomains) {
      settings.blockedDomains.forEach(domain => {
        this.blockedDomains.add(domain.toLowerCase());
      });
    }

    // Add whitelisted domains
    if (settings?.whitelistedDomains) {
      settings.whitelistedDomains.forEach(domain => {
        this.whitelistedDomains.add(domain.toLowerCase());
      });
    }
  }

  /**
   * Check if a request should be blocked
   */
  shouldBlock(request: { url: string; type?: string }): BlockedRequest {
    const url = new URL(request.url);
    const domain = url.hostname.toLowerCase();

    // Check whitelist first
    if (this.isWhitelisted(domain, url.href)) {
      return {
        url: request.url,
        type: (request.type as any) || 'other',
        blocked: false,
      };
    }

    // Check blocked domains
    if (this.blockedDomains.has(domain)) {
      this.recordBlock('domain', request.type || 'other');
      return {
        url: request.url,
        type: (request.type as any) || 'other',
        blocked: true,
        reason: 'Blocked domain',
      };
    }

    // Check filter rules
    const blocked = this.matchesFilter(url.href, domain);
    if (blocked) {
      this.recordBlock('filter', request.type || 'other');
      return {
        url: request.url,
        type: (request.type as any) || 'other',
        blocked: true,
        reason: 'Filter rule match',
      };
    }

    return {
      url: request.url,
      type: (request.type as any) || 'other',
      blocked: false,
    };
  }

  /**
   * Check if domain/URL is whitelisted
   */
  private isWhitelisted(domain: string, url: string): boolean {
    // Check exact domain match
    if (this.whitelistedDomains.has(domain)) {
      return true;
    }

    // Check domain wildcards (e.g., *.example.com)
    for (const whitelisted of this.whitelistedDomains) {
      if (whitelisted.startsWith('*.')) {
        const pattern = whitelisted.substring(2);
        if (domain.endsWith('.' + pattern) || domain === pattern) {
          return true;
        }
      }
    }

    // Check URL-based whitelist filters
    const whitelistFilters = Array.from(this.filters).filter(f => f.startsWith('@@'));
    for (const filter of whitelistFilters) {
      if (this.matchesPattern(url, filter.substring(2))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if URL matches a filter pattern
   */
  private matchesFilter(url: string, _domain: string): boolean {
    // Skip whitelist filters in this check
    const blockingFilters = Array.from(this.filters).filter(f => !f.startsWith('@@'));

    for (const filter of blockingFilters) {
      if (this.matchesPattern(url, filter)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching for adblock filters
   */
  private matchesPattern(url: string, pattern: string): boolean {
    // Skip comment lines
    if (pattern.startsWith('!') || pattern.startsWith('[')) {
      return false;
    }

    // Simple wildcard matching
    // Convert pattern to regex-like matching
    let regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*')  // * to .*
      .replace(/\^/g, '[^a-zA-Z0-9_\\-\\+\\.%]') // ^ separator
      .replace(/\|/g, '$|^'); // | anchor

    // Add anchors if not present
    if (!pattern.includes('|')) {
      regexPattern = `.*${regexPattern}.*`;
    } else {
      regexPattern = `^${regexPattern}$`;
    }

    try {
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(url);
    } catch {
      // If regex fails, do simple substring match
      return url.includes(pattern.replace(/\*/g, ''));
    }
  }

  /**
   * Record blocked request
   */
  private recordBlock(source: string, type: string): void {
    this.stats.totalBlocked++;
    this.stats.blockedByType[type] = (this.stats.blockedByType[type] || 0) + 1;
    if (source !== 'domain') {
      // Track by filter list if applicable
      // This would need to track which list matched
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Add custom filter
   */
  addCustomFilter(filter: string): void {
    this.filters.add(filter);
    this.customFilters.push(filter);
  }

  /**
   * Remove custom filter
   */
  removeCustomFilter(filter: string): void {
    this.filters.delete(filter);
    this.customFilters = this.customFilters.filter(f => f !== filter);
  }

  /**
   * Add blocked domain
   */
  addBlockedDomain(domain: string): void {
    this.blockedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove blocked domain
   */
  removeBlockedDomain(domain: string): void {
    this.blockedDomains.delete(domain.toLowerCase());
  }

  /**
   * Add whitelisted domain
   */
  addWhitelistedDomain(domain: string): void {
    this.whitelistedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove whitelisted domain
   */
  removeWhitelistedDomain(domain: string): void {
    this.whitelistedDomains.delete(domain.toLowerCase());
  }
}

// Singleton instance
let engineInstance: AdblockerEngine | null = null;

export function getAdblockerEngine(): AdblockerEngine {
  if (!engineInstance) {
    engineInstance = new AdblockerEngine();
  }
  return engineInstance;
}

