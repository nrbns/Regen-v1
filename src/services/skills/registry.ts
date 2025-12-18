/**
 * Skills Registry
 * Manages skill lifecycle (install, enable, disable, uninstall)
 */

import Dexie, { type Table } from 'dexie';
import type { Skill, SkillManifest, SkillRegistry as ISkillRegistry } from './types';

interface SkillRecord {
  id: string;
  manifest: SkillManifest;
  installedAt: number;
  enabled: boolean;
  settings: Record<string, any>;
  lastUsed?: number;
  useCount?: number;
}

class SkillsDatabase extends Dexie {
  skills!: Table<SkillRecord, string>;

  constructor() {
    super('RegenSkillsDB');
    this.version(1).stores({
      skills: 'id, installedAt, enabled',
    });
  }
}

export class SkillRegistry implements ISkillRegistry {
  private db: SkillsDatabase;
  private skills: Map<string, Skill> = new Map();
  private listeners: Map<string, Set<(skill: Skill) => void>> = new Map();

  constructor() {
    this.db = new SkillsDatabase();
    this.loadSkills();
  }

  /**
   * Load all skills from database
   */
  private async loadSkills() {
    try {
      const records = await this.db.skills.toArray();
      for (const record of records) {
        const skill: Skill = {
          id: record.id,
          manifest: record.manifest,
          installedAt: record.installedAt,
          enabled: record.enabled,
          settings: record.settings || {},
          permissions: record.manifest.permissions || [],
          lastUsed: record.lastUsed || Date.now(),
          useCount: record.useCount || 0,
          execute: async () => ({ success: false, error: 'Not implemented' }),
        };
        this.skills.set(skill.id, skill);
      }
    } catch (error) {
      console.error('[SkillRegistry] Failed to load skills:', error);
    }
  }

  /**
   * Validate skill manifest
   */
  private validateManifest(manifest: SkillManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid manifest: id, name, and version are required');
    }

    if (!manifest.actions || manifest.actions.length === 0) {
      throw new Error('Invalid manifest: at least one action is required');
    }

    // Validate ID format (alphanumeric, dashes, underscores)
    if (!/^[a-z0-9-_]+$/.test(manifest.id)) {
      throw new Error(
        'Invalid manifest: id must be lowercase alphanumeric with dashes/underscores'
      );
    }
  }

  /**
   * Install a new skill
   */
  async install(manifest: SkillManifest): Promise<Skill> {
    this.validateManifest(manifest);

    // Check if already installed
    if (this.skills.has(manifest.id)) {
      throw new Error(`Skill ${manifest.id} is already installed`);
    }

    const skill: Skill = {
      id: manifest.id,
      manifest,
      installedAt: Date.now(),
      enabled: false, // Disabled by default until permissions are granted
      settings: this.getDefaultSettings(manifest),
      permissions: manifest.permissions || [],
      useCount: 0,
      execute: async () => ({ success: false, error: 'Not implemented' }),
    };

    // Save to database
    await this.db.skills.add({
      id: skill.id,
      manifest: skill.manifest,
      installedAt: skill.installedAt,
      enabled: skill.enabled,
      settings: skill.settings,
      useCount: skill.useCount ?? 0,
    });

    this.skills.set(skill.id, skill);
    this.emit('installed', skill);

    return skill;
  }

  /**
   * Uninstall a skill
   */
  async uninstall(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    await this.db.skills.delete(skillId);
    this.skills.delete(skillId);
    this.emit('uninstalled', skill);
  }

  /**
   * Enable a skill
   */
  async enable(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    // Check permissions
    const hasPermissions = await this.checkPermissions(skill);
    if (!hasPermissions) {
      throw new Error(`Cannot enable skill: missing required permissions`);
    }

    skill.enabled = true;
    await this.db.skills.update(skillId, { enabled: true });
    this.emit('enabled', skill);
  }

  /**
   * Disable a skill
   */
  async disable(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    skill.enabled = false;
    await this.db.skills.update(skillId, { enabled: false });
    this.emit('disabled', skill);
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): Skill | null {
    return this.skills.get(skillId) || null;
  }

  /**
   * Get all installed skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get all enabled skills
   */
  getEnabled(): Skill[] {
    return Array.from(this.skills.values()).filter(skill => skill.enabled);
  }

  register(skillId: string, skill: Skill): void {
    this.skills.set(skillId, skill);
  }

  /**
   * Update skill manifest
   */
  async update(skillId: string, manifest: SkillManifest): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    this.validateManifest(manifest);
    if (manifest.id !== skillId) {
      throw new Error('Cannot change skill ID');
    }

    skill.manifest = manifest;
    skill.permissions = manifest.permissions || [];

    await this.db.skills.update(skillId, {
      manifest,
    } as any);

    this.emit('updated', skill);
  }

  /**
   * Update skill settings
   */
  async updateSettings(skillId: string, settings: Record<string, any>): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    // Validate settings against manifest
    if (skill.manifest.settings) {
      for (const [key, _value] of Object.entries(settings)) {
        const settingDef = skill.manifest.settings[key];
        if (!settingDef) {
          throw new Error(`Unknown setting: ${key}`);
        }
        // Type validation could go here
      }
    }

    skill.settings = { ...skill.settings, ...settings };
    await this.db.skills.update(skillId, { settings: skill.settings });
    this.emit('settingsUpdated', skill);
  }

  /**
   * Get default settings from manifest
   */
  private getDefaultSettings(manifest: SkillManifest): Record<string, any> {
    const defaults: Record<string, any> = {};
    if (manifest.settings) {
      for (const [key, setting] of Object.entries(manifest.settings)) {
        defaults[key] = setting.default;
      }
    }
    return defaults;
  }

  /**
   * Check if skill has required permissions
   */
  private async checkPermissions(skill: Skill): Promise<boolean> {
    // Check if permissions are granted
    // For now, return true - in production, check actual permission grants
    const requiredPermissions = (skill.manifest.permissions || []).filter(p => p.required);

    if (requiredPermissions.length === 0) {
      return true;
    }

    // Check localStorage for permission grants
    const grants = this.getPermissionGrants(skill.id);
    for (const perm of requiredPermissions) {
      if (!grants.includes(perm.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get permission grants for a skill
   */
  private getPermissionGrants(skillId: string): string[] {
    try {
      const grants = localStorage.getItem(`skill-permissions-${skillId}`);
      return grants ? JSON.parse(grants) : [];
    } catch {
      return [];
    }
  }

  /**
   * Grant permissions to a skill
   */
  async grantPermissions(skillId: string, permissions: string[]): Promise<void> {
    localStorage.setItem(`skill-permissions-${skillId}`, JSON.stringify(permissions));
    const skill = this.skills.get(skillId);
    if (skill) {
      this.emit('permissionsGranted', skill);
    }
  }

  /**
   * Event listeners
   */
  on(event: string, callback: (skill: Skill) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (skill: Skill) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, skill: Skill): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(skill);
      } catch (error) {
        console.error(`[SkillRegistry] Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Record skill usage
   */
  async recordUsage(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    skill.lastUsed = Date.now();
    skill.useCount = (skill.useCount || 0) + 1;

    await this.db.skills.update(skillId, {
      lastUsed: skill.lastUsed,
      useCount: skill.useCount,
    });
  }
}

// Singleton instance
let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
  if (!registryInstance) {
    registryInstance = new SkillRegistry();
  }
  return registryInstance;
}
