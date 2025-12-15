/**
 * Calendar Skill Integration
 * Integrates Calendar skill with skills engine
 */

import { getSkillRegistry } from '../registry';
import { getSkillEngine } from '../engine';
import { getCalendarSkill, CALENDAR_SKILL_MANIFEST } from './skill';
import type { SkillContext, SkillResult } from '../types';

/**
 * Initialize Calendar skill and register with engine
 */
export async function initializeCalendarSkill(config?: {
  clientId: string;
  redirectUri: string;
}): Promise<void> {
  const registry = getSkillRegistry();
  const engine = getSkillEngine();

  // Check if skill is already installed
  let skill = registry.get(CALENDAR_SKILL_MANIFEST.id);

  if (!skill) {
    // Install skill
    skill = await registry.install(CALENDAR_SKILL_MANIFEST);
  }

  // Initialize Calendar skill if config provided
  if (config) {
    const calendarSkill = getCalendarSkill();
    await calendarSkill.initialize(config);
  }

  // Register action handlers
  const calendarSkill = getCalendarSkill();

  engine.registerHandler('create_calendar_event', async (ctx: any) => {
    const context: SkillContext = {
      skillId: CALENDAR_SKILL_MANIFEST.id,
      pageUrl: ctx.page?.url || window.location.href,
      pageTitle: ctx.page?.title || document.title,
      pageContent: ctx.page?.content,
      selectedText: ctx.page?.selectedText,
      permissions: [],
    };

    return calendarSkill.createEvent(context, ctx.data || {});
  });

  engine.registerHandler('schedule_meeting', async (ctx: any) => {
    const context: SkillContext = {
      skillId: CALENDAR_SKILL_MANIFEST.id,
      pageUrl: ctx.page?.url || window.location.href,
      pageTitle: ctx.page?.title || document.title,
      pageContent: ctx.page?.content,
      selectedText: ctx.page?.selectedText,
      permissions: [],
    };

    return calendarSkill.scheduleMeeting(context, ctx.data);
  });
}

/**
 * Execute Calendar create event action
 */
export async function createEvent(_data: {
  summary: string;
  start: Date | string;
  end: Date | string;
  description?: string;
  location?: string;
  allDay?: boolean;
  attendees?: string[];
}): Promise<SkillResult> {
  const engine = getSkillEngine();
  const context: SkillContext = {
    skillId: CALENDAR_SKILL_MANIFEST.id,
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  };

  return engine.execute(CALENDAR_SKILL_MANIFEST.id, {
    ...context,
    action: {
      type: 'create_calendar_event',
      name: 'Create Calendar Event',
      description: 'Create calendar event',
      handler: 'createEvent',
    },
  });
}

/**
 * Execute Calendar schedule meeting action
 */
export async function scheduleMeeting(_data?: {
  summary?: string;
  start?: Date | string;
  end?: Date | string;
}): Promise<SkillResult> {
  const engine = getSkillEngine();
  const context: SkillContext = {
    skillId: CALENDAR_SKILL_MANIFEST.id,
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  };

  return engine.execute(CALENDAR_SKILL_MANIFEST.id, {
    ...context,
    action: {
      type: 'create_calendar_event',
      name: 'Schedule Meeting',
      description: 'Schedule meeting',
      handler: 'scheduleMeeting',
    },
  });
}
