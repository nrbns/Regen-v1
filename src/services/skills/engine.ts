/**
 * Skills Engine
 * Manages skill registration, execution, and lifecycle
 */

import { getSkillRegistry } from './registry';

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
}

export class SkillsEngine {
  private registry = getSkillRegistry();

  /**
   * Execute a skill by ID
   */
  async executeSkill(skillId: string, context: any, _options?: SkillExecutionOptions): Promise<any> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    if (!skill.enabled) {
      throw new Error(`Skill is disabled: ${skillId}`);
    }

    try {
      return await skill.execute(context);
    } catch (error) {
      console.error(`[SkillsEngine] Skill execution failed: ${skillId}`, error);
      throw error;
    }
  }

  /**
   * Get enabled skills
   */
  getEnabledSkills() {
    return this.registry.getEnabled();
  }

  /**
   * Register a skill
   */
  registerSkill(skillId: string, skill: any): void {
    this.registry.register(skillId, skill);
  }

  /**
   * Enable skill
   */
  enableSkill(skillId: string): void {
    const skill = this.registry.get(skillId);
    if (skill) {
      skill.enabled = true;
    }
  }

  /**
   * Disable skill
   */
  disableSkill(skillId: string): void {
    const skill = this.registry.get(skillId);
    if (skill) {
      skill.enabled = false;
    }
  }
}

let skillsEngine: SkillsEngine | null = null;

export function getSkillEngine(): SkillsEngine {
  if (!skillsEngine) {
    skillsEngine = new SkillsEngine();
  }
  return skillsEngine;
}
