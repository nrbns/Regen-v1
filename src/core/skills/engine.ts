/**
 * Skills Engine - The Long-Term Advantage
 *
 * This is how you win long-term:
 * - Save what AI does as reusable skills
 * - Skills are deterministic, shareable, programmable
 * - This is how Linux packages, iOS apps, AWS services were born
 *
 * Usage:
 *
 * ```ts
 * import { skillsEngine } from '@/core/skills';
 *
 * // Save a skill from an AI action
 * await skillsEngine.saveFromJob(jobId, {
 *   name: 'Research Topic',
 *   description: 'Research a topic and summarize'
 * });
 *
 * // Execute a skill
 * await skillsEngine.execute('skill-123', { topic: 'AI' });
 * ```
 */

import { eventLedger } from '../eventLedger';
import { jobAuthority } from '../jobAuthority';
import type { SkillDefinition as _SkillDefinition } from '../../../packages/shared/skills';

export interface SavedSkill {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  jobId: string; // Original job that created this skill
  events: string[]; // Event IDs from the ledger
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  execution: {
    steps: string[];
    tools?: string[];
  };
}

class SkillsEngine {
  private skills = new Map<string, SavedSkill>();

  /**
   * Save a skill from a completed job
   */
  async saveFromJob(
    jobId: string,
    metadata: {
      name: string;
      description?: string;
    }
  ): Promise<SavedSkill> {
    // Get all events for this job
    const events = await eventLedger.getByJobId(jobId);

    // Extract execution steps
    const steps: string[] = [];
    const tools: string[] = [];
    const inputs: Record<string, any> = {};
    const outputs: Record<string, any> = {};

    for (const event of events) {
      if (event.type === 'ai:action:start') {
        steps.push(event.data.action || event.type);
        if (event.data.tool) {
          tools.push(event.data.tool);
        }
        // Capture inputs
        Object.assign(inputs, event.data);
      }
      if (event.type === 'ai:action:complete' && event.data.result) {
        Object.assign(outputs, event.data.result);
      }
    }

    const skill: SavedSkill = {
      id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: metadata.name,
      description: metadata.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      jobId,
      events: events.map(e => e.id),
      inputs,
      outputs,
      execution: {
        steps,
        tools: tools.length > 0 ? tools : undefined,
      },
    };

    this.skills.set(skill.id, skill);

    // Persist to localStorage
    this.persistSkill(skill);

    // Log skill creation
    await eventLedger.log({
      type: 'skill:create',
      userId: 'system', // TODO: Get actual user ID
      data: {
        skillId: skill.id,
        name: skill.name,
        jobId,
      },
      reasoning: `Skill "${skill.name}" created from job ${jobId}`,
    });

    return skill;
  }

  /**
   * Execute a skill - replay events with new inputs
   */
  async execute(skillId: string, inputs: Record<string, any>): Promise<Record<string, any>> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      // Try loading from localStorage
      const loaded = this.loadSkill(skillId);
      if (!loaded) {
        throw new Error(`Skill ${skillId} not found`);
      }
      this.skills.set(skillId, loaded);
      skill = loaded;
    }

    // Create new job for this skill execution
    const job = await jobAuthority.createJob({
      userId: 'system', // TODO: Get actual user ID
      type: 'skill',
      query: `Execute skill: ${skill.name}`,
      data: { skillId, inputs },
    });

    try {
      // Log skill execution start
      await eventLedger.log({
        type: 'skill:execute',
        jobId: job.jobId,
        userId: job.userId,
        data: {
          skillId,
          name: skill.name,
          inputs,
        },
        reasoning: `Executing skill "${skill.name}" with inputs`,
      });

      // Replay events from original job, but with new inputs
      const _originalEvents = await eventLedger.query({
        jobId: skill.jobId,
      });

      // TODO: Actually replay the events with new inputs
      // For now, return the outputs
      const outputs = skill.outputs;

      // Log completion
      await eventLedger.log({
        type: 'skill:execute',
        jobId: job.jobId,
        userId: job.userId,
        data: {
          skillId,
          result: outputs,
        },
        reasoning: `Skill "${skill.name}" execution completed`,
      });

      await jobAuthority.complete(job.jobId, outputs);

      return outputs;
    } catch (error) {
      await eventLedger.log({
        type: 'ai:action:error',
        jobId: job.jobId,
        userId: job.userId,
        data: {
          skillId,
          error: error instanceof Error ? error.message : String(error),
        },
        reasoning: `Skill "${skill.name}" execution failed`,
      });
      throw error;
    }
  }

  /**
   * List all skills
   */
  listSkills(): SavedSkill[] {
    // Load from localStorage if not in memory
    this.loadAllSkills();
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): SavedSkill | undefined {
    let skill = this.skills.get(skillId);
    if (!skill) {
      skill = this.loadSkill(skillId);
      if (skill) {
        this.skills.set(skillId, skill);
      }
    }
    return skill;
  }

  /**
   * Delete skill
   */
  async deleteSkill(skillId: string): Promise<void> {
    this.skills.delete(skillId);

    // Remove from localStorage
    if (typeof window !== 'undefined') {
      try {
        const skills = JSON.parse(localStorage.getItem('regen:skills') || '{}');
        delete skills[skillId];
        localStorage.setItem('regen:skills', JSON.stringify(skills));
      } catch (error) {
        console.error('[SkillsEngine] Failed to delete skill:', error);
      }
    }
  }

  /**
   * Persist skill to localStorage
   */
  private persistSkill(skill: SavedSkill): void {
    if (typeof window === 'undefined') return;

    try {
      const skills = JSON.parse(localStorage.getItem('regen:skills') || '{}');
      skills[skill.id] = skill;
      localStorage.setItem('regen:skills', JSON.stringify(skills));
    } catch (error) {
      console.error('[SkillsEngine] Failed to persist skill:', error);
    }
  }

  /**
   * Load skill from localStorage
   */
  private loadSkill(skillId: string): SavedSkill | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
      const skills = JSON.parse(localStorage.getItem('regen:skills') || '{}');
      return skills[skillId];
    } catch (error) {
      console.error('[SkillsEngine] Failed to load skill:', error);
      return undefined;
    }
  }

  /**
   * Load all skills from localStorage
   */
  private loadAllSkills(): void {
    if (typeof window === 'undefined') return;

    try {
      const skills = JSON.parse(localStorage.getItem('regen:skills') || '{}');
      for (const [id, skill] of Object.entries(skills)) {
        this.skills.set(id, skill as SavedSkill);
      }
    } catch (error) {
      console.error('[SkillsEngine] Failed to load skills:', error);
    }
  }
}

export const skillsEngine = new SkillsEngine();

// Load skills on startup
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    skillsEngine.listSkills(); // Triggers loadAllSkills
  });
}
