/**
 * Skills Types
 * Type definitions for skills system
 */

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  permissions?: SkillPermission[];
  triggers?: SkillTrigger[];
  actions?: SkillAction[];
  settings?: Record<string, { default?: any; description?: string; type?: string }>;
}

export interface SkillPermission {
  type: string;
  description: string;
  required: boolean;
}

export interface SkillTrigger {
  type: 'manual' | 'text_selection' | 'page_load' | 'scheduled';
  [key: string]: any;
}

export interface SkillAction {
  type: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
  handler?: string;
}

export interface SkillContext {
  skillId?: string;
  selectedText?: string;
  pageTitle?: string;
  pageUrl?: string;
  pageContent?: string;
  action?: SkillAction;
  metadata?: Record<string, any>;
  permissions?: string[];
  data?: Record<string, any>;
  suggestedSubject?: string;
  suggestedBody?: string;
  suggestedRecipients?: string[];
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface Skill {
  id: string;
  manifest: SkillManifest;
  enabled: boolean;
  installedAt?: number;
  settings: Record<string, any>;
  permissions?: SkillPermission[];
  lastUsed?: number;
  useCount?: number;
  execute(context: SkillContext): Promise<SkillResult>;
  initialize?(config?: any): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface SkillRegistry {
  install(manifest: SkillManifest): Promise<Skill>;
  uninstall(skillId: string): Promise<void>;
  enable(skillId: string): Promise<void>;
  disable(skillId: string): Promise<void>;
  get(skillId: string): Skill | null;
  getAll(): Skill[];
  getEnabled(): Skill[];
  update(skillId: string, manifest: SkillManifest): Promise<void>;
  updateSettings(skillId: string, settings: Record<string, any>): Promise<void>;
  register(skillId: string, skill: Skill): void;
}
