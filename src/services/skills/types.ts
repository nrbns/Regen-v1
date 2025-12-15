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
}

export interface SkillContext {
  selectedText?: string;
  pageTitle?: string;
  pageUrl?: string;
  pageContent?: string;
  metadata?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Skill {
  manifest: SkillManifest;
  enabled: boolean;
  execute(context: SkillContext): Promise<SkillResult>;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}
