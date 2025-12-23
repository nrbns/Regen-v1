/**
 * Sample Skill: Google Calendar Invite
 *
 * Creates Google Calendar events from page content or manual input
 */

import {
  createSkill,
  validateManifest,
  permission,
  trigger,
  type SkillManifest,
} from '@regen/skills-sdk';

const manifest: SkillManifest = {
  id: 'gcal-invite',
  name: 'Google Calendar Invite',
  version: '1.0.0',
  description: 'Create Google Calendar events from page content or manual input',
  author: 'Regen Browser Team',
  permissions: [
    permission('api', 'https://www.googleapis.com/calendar/v3'),
    permission('dom', 'read'),
    permission('storage', 'write'),
  ],
  triggers: [
    trigger('action', { name: 'create-event' }),
    trigger('page', { pattern: 'https://meet.google.com/*' }),
    trigger('page', { pattern: 'https://zoom.us/j/*' }),
  ],
  settings: {
    calendarId: {
      type: 'string',
      label: 'Calendar ID',
      description: 'Your Google Calendar ID (default is primary)',
      default: 'primary',
      required: true,
    },
    autoDetectMeetings: {
      type: 'boolean',
      label: 'Auto-detect meetings',
      description: 'Automatically create events when visiting meeting links',
      default: true,
    },
  },
};

validateManifest(manifest);

const skill = createSkill(manifest, {
  onAction: async (action, context) => {
    if (action.name === 'create-event') {
      const { title, start, end, description, location, attendees } = action.params || {};

      if (!title || !start || !end) {
        return {
          success: false,
          error: 'Missing required parameters: title, start, end',
        };
      }

      const calendarId = context.settings?.calendarId || 'primary';
      const accessToken = context.tokens?.google;

      if (!accessToken) {
        return {
          success: false,
          error: 'Google OAuth token not found. Please authenticate first.',
        };
      }

      try {
        // Call Google Calendar API
        const response = await context.api.request(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: title,
              description: description || '',
              location: location || '',
              start: {
                dateTime: start,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              end: {
                dateTime: end,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              attendees: attendees?.map((email: string) => ({ email })) || [],
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.error?.message || 'Failed to create calendar event',
          };
        }

        const event = await response.json();

        // Store event ID for reference
        await context.storage.set(`event:${event.id}`, {
          id: event.id,
          title,
          createdAt: Date.now(),
        });

        return {
          success: true,
          data: {
            id: event.id,
            htmlLink: event.htmlLink,
            title: event.summary,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to create calendar event',
        };
      }
    }

    return {
      success: false,
      error: `Unknown action: ${action.name}`,
    };
  },

  onPageVisit: async (url, context) => {
    if (!context.settings?.autoDetectMeetings) {
      return;
    }

    // Extract meeting details from URL
    if (url.includes('meet.google.com')) {
      const meetingId = url.match(/meet\.google\.com\/([a-z-]+)/)?.[1];
      if (meetingId) {
        // Extract title from page
        const pageTitle = await context.dom.query('title');
        const title = pageTitle?.text || `Google Meet: ${meetingId}`;

        // Suggest creating event (would trigger UI prompt in real implementation)
        console.log('[GCal Invite] Detected meeting:', { meetingId, title });
      }
    } else if (url.includes('zoom.us/j/')) {
      const meetingId = url.match(/zoom\.us\/j\/(\d+)/)?.[1];
      if (meetingId) {
        const pageTitle = await context.dom.query('title');
        const title = pageTitle?.text || `Zoom Meeting: ${meetingId}`;

        console.log('[GCal Invite] Detected Zoom meeting:', { meetingId, title });
      }
    }
  },
});

export default skill;
