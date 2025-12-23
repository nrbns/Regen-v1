# Google Calendar Invite Skill

Sample skill that creates Google Calendar events from page content or manual input.

## Features

- Create calendar events manually via action
- Auto-detect meeting links (Google Meet, Zoom)
- Extract meeting details from page
- Support for attendees, location, description

## Usage

### Manual Event Creation

```typescript
// Trigger via skill action
await skill.execute(
  {
    name: 'create-event',
    params: {
      title: 'Team Meeting',
      start: '2024-12-15T10:00:00',
      end: '2024-12-15T11:00:00',
      description: 'Weekly team sync',
      location: 'Conference Room A',
      attendees: ['user@example.com'],
    },
  },
  context
);
```

### Auto-Detection

When visiting a Google Meet or Zoom link, the skill can automatically detect meeting details and prompt to create an event.

## Configuration

- `calendarId`: Google Calendar ID (default: 'primary')
- `autoDetectMeetings`: Enable auto-detection (default: true)

## Permissions

- `api`: Access to Google Calendar API
- `dom`: Read page content
- `storage`: Store event references

## Setup

1. Authenticate with Google OAuth (handled by Regen Browser)
2. Configure calendar ID in skill settings
3. Enable auto-detection if desired
