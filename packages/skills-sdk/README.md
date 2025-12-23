# Regen Browser Skills SDK

SDK for building Skills (plugins) for Regen Browser.

## Overview

Skills extend Regen Browser with custom automation, integrations, and workflows. They run in a secure sandbox with controlled permissions.

## Installation

```bash
npm install @regen/skills-sdk
```

## Quick Start

```typescript
import { createSkill, SkillManifest, Permission } from '@regen/skills-sdk';

const manifest: SkillManifest = {
  id: 'my-skill',
  name: 'My Skill',
  version: '1.0.0',
  description: 'A sample skill',
  permissions: [
    { name: 'storage', scope: 'read' },
    { name: 'api', scope: 'https://api.example.com' },
  ],
  triggers: [{ type: 'action', name: 'my-action' }],
};

const skill = createSkill(manifest, {
  onAction: async (action, context) => {
    // Handle action
    return { success: true, data: 'result' };
  },
});

export default skill;
```

## Concepts

### Skill Manifest

Every skill must define a manifest:

```typescript
interface SkillManifest {
  id: string; // Unique ID
  name: string; // Display name
  version: string; // Semver version
  description: string; // Description
  author?: string; // Author name
  icon?: string; // Icon URL
  permissions: Permission[]; // Required permissions
  triggers: Trigger[]; // Event triggers
  settings?: SkillSettings; // Configurable settings
}
```

### Permissions

Skills request permissions they need:

```typescript
const permissions: Permission[] = [
  { name: 'storage', scope: 'read' }, // Read storage
  { name: 'storage', scope: 'write' }, // Write storage
  { name: 'api', scope: 'https://api.example.com' }, // API access
  { name: 'dom', scope: 'read' }, // Read DOM
  { name: 'dom', scope: 'write' }, // Modify DOM
  { name: 'tabs', scope: 'read' }, // Read tabs
  { name: 'tabs', scope: 'write' }, // Create/modify tabs
];
```

### Triggers

Skills can respond to different triggers:

```typescript
const triggers: Trigger[] = [
  { type: 'action', name: 'my-action' }, // Manual action
  { type: 'page', pattern: 'https://example.com/*' }, // Page visit
  { type: 'schedule', cron: '0 9 * * *' }, // Scheduled
  { type: 'event', name: 'user-action' }, // Custom event
];
```

### Actions

Handle actions in your skill:

```typescript
{
  onAction: async (action, context) => {
    const { name, params } = action;

    if (name === 'my-action') {
      // Execute action
      const result = await doSomething(params);
      return { success: true, data: result };
    }

    throw new Error(`Unknown action: ${name}`);
  },
}
```

### Settings

Define configurable settings:

```typescript
const settings: SkillSettings = {
  apiKey: {
    type: 'string',
    label: 'API Key',
    required: true,
    secret: true,
  },
  enableNotifications: {
    type: 'boolean',
    label: 'Enable Notifications',
    default: true,
  },
};
```

## Example: Google Calendar Skill

```typescript
import { createSkill, Permission } from '@regen/skills-sdk';

const manifest = {
  id: 'gcal-invite',
  name: 'Google Calendar Invite',
  version: '1.0.0',
  description: 'Create Google Calendar events from page content',
  permissions: [
    { name: 'api', scope: 'https://www.googleapis.com/calendar/v3' },
    { name: 'dom', scope: 'read' },
  ],
  triggers: [
    { type: 'action', name: 'create-event' },
    { type: 'page', pattern: 'https://meet.google.com/*' },
  ],
  settings: {
    calendarId: {
      type: 'string',
      label: 'Calendar ID',
      required: true,
    },
  },
};

const skill = createSkill(manifest, {
  onAction: async (action, context) => {
    if (action.name === 'create-event') {
      const { title, start, end } = action.params;

      // Call Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${context.settings.calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.tokens.google}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
          }),
        }
      );

      const event = await response.json();
      return { success: true, data: event };
    }
  },

  onPageVisit: async (url, context) => {
    // Auto-detect meeting links and create events
    if (url.includes('meet.google.com')) {
      // Extract meeting details and create event
    }
  },
});

export default skill;
```

## API Reference

### `createSkill(manifest, handlers)`

Creates a skill instance.

**Parameters:**

- `manifest`: SkillManifest
- `handlers`: SkillHandlers

**Returns:** Skill instance

### `Permission`

```typescript
interface Permission {
  name: string; // Permission name (storage, api, dom, tabs)
  scope: string; // Permission scope (read, write, URL pattern)
}
```

### `Trigger`

```typescript
interface Trigger {
  type: 'action' | 'page' | 'schedule' | 'event';
  name?: string; // For action/event triggers
  pattern?: string; // For page triggers (glob pattern)
  cron?: string; // For schedule triggers
}
```

### `SkillContext`

```typescript
interface SkillContext {
  userId: string;
  deviceId: string;
  settings: Record<string, any>;
  tokens: Record<string, string>; // OAuth tokens
  storage: Storage; // Secure storage API
  api: APIClient; // API client with permissions
  dom: DOMAPI; // DOM access API
  tabs: TabsAPI; // Tabs API
}
```

## Publishing Skills

1. Build your skill: `npm run build`
2. Create a manifest file: `skill.json`
3. Submit to Regen Browser Skills Marketplace (coming soon)

## Security

Skills run in a secure sandbox with:

- Permission-based access control
- Resource limits (memory, CPU, network)
- Timeout protection
- Automatic sandbox cleanup

## Support

- Documentation: https://docs.regen.browser/skills
- Examples: https://github.com/regen-browser/skills-examples
- Discord: https://discord.gg/regen-browser
