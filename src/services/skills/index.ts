/**
 * Skills Index
 * Centralized export for skills functionality
 */

export { getSkillEngine, type SkillExecutionOptions } from './engine';
export { getSkillRegistry } from './registry';
export type {
  SkillManifest,
  SkillPermission,
  SkillTrigger,
  SkillAction,
  SkillContext,
  SkillResult,
  Skill,
} from './types';

// Re-export Gmail skill
export { getGmailSkill, GMAIL_SKILL_MANIFEST } from './gmail/skill';
