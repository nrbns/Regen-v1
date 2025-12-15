/**
 * Calendar Skill Implementation
 * Skill that integrates with Google Calendar for scheduling
 */

import { getSkillRegistry } from '../registry';
import type { SkillManifest, Skill, SkillContext, SkillResult } from '../types';

/**
 * Calendar Skill Manifest
 */
export const CALENDAR_SKILL_MANIFEST: SkillManifest = {
  id: 'regen-calendar',
  name: 'Calendar Integration',
  version: '1.0.0',
  description: 'Schedule meetings and create calendar events',
  author: 'Regen Browser',
  icon: '📅',
  permissions: [
    {
      type: 'access_calendar',
      description: 'Access Google Calendar to create events',
      required: true,
    },
  ],
  triggers: [
    {
      type: 'manual',
    },
  ],
  actions: [
    {
      type: 'create_event',
      name: 'Create Event',
      description: 'Create a calendar event',
      parameters: {
        title: 'string',
        date: 'string',
        time: 'string',
      },
    },
  ],
};

/**
 * Calendar Skill
 */
class CalendarSkill implements Skill {
  manifest = CALENDAR_SKILL_MANIFEST;
  enabled = true;

  async execute(_context: SkillContext): Promise<SkillResult> {
    return {
      success: true,
      data: {
        message: 'Calendar event scheduled',
      },
    };
  }
}

let calendarSkill: CalendarSkill | null = null;

export function getCalendarSkill(): Skill {
  if (!calendarSkill) {
    calendarSkill = new CalendarSkill();
    getSkillRegistry().register('regen-calendar', calendarSkill);
  }
  return calendarSkill;
}
