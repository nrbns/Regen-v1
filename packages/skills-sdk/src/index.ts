/**
 * Regen Browser Skills SDK
 *
 * Type definitions and utilities for building Skills
 */

export interface Permission {
  name: 'storage' | 'api' | 'dom' | 'tabs' | 'notifications';
  scope: string; // 'read' | 'write' | URL pattern | '*'
}

export interface Trigger {
  type: 'action' | 'page' | 'schedule' | 'event';
  name?: string; // For action/event triggers
  pattern?: string; // For page triggers (glob pattern)
  cron?: string; // For schedule triggers
}

export interface SkillSettings {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    description?: string;
    default?: any;
    required?: boolean;
    secret?: boolean; // Hide value in UI
    options?: string[]; // For select type
  };
}

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  permissions: Permission[];
  triggers: Trigger[];
  settings?: SkillSettings;
}

export interface SkillContext {
  userId: string;
  deviceId: string;
  settings: Record<string, any>;
  tokens: Record<string, string>; // OAuth tokens
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  api: {
    request: (url: string, options?: RequestInit) => Promise<Response>;
  };
  dom: {
    query: (selector: string) => Promise<any>;
    extract: (selectors: Record<string, string>) => Promise<Record<string, any>>;
  };
  tabs: {
    get: (tabId: string) => Promise<any>;
    create: (url: string) => Promise<string>;
    update: (tabId: string, url: string) => Promise<void>;
  };
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SkillHandlers {
  onAction?: (
    action: { name: string; params?: any },
    context: SkillContext
  ) => Promise<ActionResult>;
  onPageVisit?: (url: string, context: SkillContext) => Promise<void>;
  onSchedule?: (context: SkillContext) => Promise<void>;
  onEvent?: (event: { name: string; data?: any }, context: SkillContext) => Promise<void>;
}

export interface Skill {
  manifest: SkillManifest;
  handlers: SkillHandlers;
  execute: (action: { name: string; params?: any }, context: SkillContext) => Promise<ActionResult>;
}

/**
 * Create a skill instance
 */
export function createSkill(manifest: SkillManifest, handlers: SkillHandlers): Skill {
  return {
    manifest,
    handlers,
    execute: async (action, context) => {
      if (handlers.onAction) {
        return handlers.onAction(action, context);
      }
      throw new Error(`No handler for action: ${action.name}`);
    },
  };
}

/**
 * Validate skill manifest
 */
export function validateManifest(manifest: any): manifest is SkillManifest {
  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new Error('Manifest must have a valid id');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('Manifest must have a valid name');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    throw new Error('Manifest must have a valid version');
  }

  if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
    throw new Error('Manifest must have permissions array');
  }

  if (!manifest.triggers || !Array.isArray(manifest.triggers)) {
    throw new Error('Manifest must have triggers array');
  }

  return true;
}

/**
 * Helper to create permission
 */
export function permission(name: Permission['name'], scope: string): Permission {
  return { name, scope };
}

/**
 * Helper to create trigger
 */
export function trigger(type: Trigger['type'], options?: Partial<Trigger>): Trigger {
  return { type, ...options } as Trigger;
}
