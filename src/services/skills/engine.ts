/**
 * Skills Engine
 * Manages skill registration, execution, and lifecycle
 */

import { getSkillRegistry } from './registry';
import type { SkillContext, SkillResult } from './types';

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
}

export class SkillsEngine {
  private registry = getSkillRegistry();
  private handlers: Map<string, (context: SkillContext) => Promise<SkillResult>> = new Map();

  /**
   * Execute a skill by ID
   */
  async executeSkill(
    skillId: string,
    context: SkillContext,
    _options?: SkillExecutionOptions
  ): Promise<SkillResult> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    if (!skill.enabled) {
      throw new Error(`Skill is disabled: ${skillId}`);
    }

    try {
      // If an action handler is provided, route to it
      if (context.action?.handler) {
        const handler = this.handlers.get(context.action.handler);
        if (handler) {
          return handler(context);
        }
      }

      return await skill.execute(context);
    } catch (error) {
      console.error(`[SkillsEngine] Skill execution failed: ${skillId}`, error);
      throw error;
    }
  }

  registerHandler(
    actionId: string,
    handler: (context: SkillContext) => Promise<SkillResult>
  ): void {
    this.handlers.set(actionId, handler);
  }

  /**
   * Execute skill action (alias for executeSkill)
   */
  async execute(skillId: string, context: SkillContext): Promise<SkillResult> {
    return this.executeSkill(skillId, context);
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
