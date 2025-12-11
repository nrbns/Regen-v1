# 🛠️ Regen Browser - Skills Engine Architecture

**Technical Design Document**

**Date**: December 2025  
**Version**: 1.0  
**Status**: Design Phase

---

## 🎯 Overview

The Skills Engine is a plugin system that enables automation workflows, integrations, and AI-powered actions within Regen Browser. It allows third-party developers and users to extend browser functionality with custom skills.

### Goals

- Enable Gmail, Calendar, and other service integrations
- Support page-level automation and AI actions
- Provide secure sandboxed execution environment
- Allow skill marketplace for ecosystem growth

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Regen Browser                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Skill UI    │  │ Skill Engine │  │  Skill API   │ │
│  │  Components  │  │   Core       │  │   Layer      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Skill      │  │   Security   │  │   Storage    │ │
│  │  Registry    │  │   Sandbox    │  │   Layer      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Gmail      │  │  Calendar    │  │  Autofill    │ │
│  │   Skill      │  │   Skill      │  │   Skill      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Core Components

### 1. Skill Registry

**Purpose**: Manage skill lifecycle (install, enable, disable, uninstall)

**Location**: `src/services/skills/registry.ts`

```typescript
interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: Permission[];
  triggers: Trigger[];
  actions: Action[];
  settings?: SkillSettings;
}

interface SkillRegistry {
  install(manifest: SkillManifest): Promise<Skill>;
  uninstall(skillId: string): Promise<void>;
  enable(skillId: string): Promise<void>;
  disable(skillId: string): Promise<void>;
  get(skillId: string): Skill | null;
  getAll(): Skill[];
  update(skillId: string, manifest: SkillManifest): Promise<void>;
}
```

**Implementation Details**:

- Store skills in IndexedDB
- Validate manifests before installation
- Check permissions on enable
- Emit events for skill lifecycle changes

---

### 2. Skill Execution Engine

**Purpose**: Execute skills in a secure, sandboxed environment

**Location**: `src/services/skills/engine.ts`

```typescript
interface SkillContext {
  pageUrl: string;
  pageContent: string;
  selectedText?: string;
  userData?: any;
  permissions: Permission[];
}

interface SkillEngine {
  execute(skillId: string, actionId: string, context: SkillContext): Promise<ActionResult>;
  validateAction(skillId: string, actionId: string): boolean;
  checkPermissions(skillId: string, required: Permission[]): boolean;
}
```

**Security Model**:

- Each skill runs in isolated context
- Permission-based access control
- No direct DOM access (mediated through API)
- Rate limiting per skill
- Timeout protection (30s max execution)

---

### 3. Security Sandbox

**Purpose**: Isolate skill execution from browser core

**Location**: `src/services/skills/sandbox.ts`

**Features**:

- Web Worker isolation (optional, for heavy skills)
- Permission whitelist system
- API mediation layer
- Resource access control
- Execution timeouts

**Permission Types**:

```typescript
type Permission =
  | 'read:page'
  | 'read:selection'
  | 'write:clipboard'
  | 'api:gmail'
  | 'api:calendar'
  | 'storage:read'
  | 'storage:write'
  | 'network:request';
```

---

### 4. Skill API Layer

**Purpose**: Provide safe APIs for skills to interact with browser

**Location**: `src/services/skills/api.ts`

**APIs Available**:

```typescript
interface SkillAPI {
  // Page APIs
  getPageContent(): Promise<string>;
  getPageUrl(): Promise<string>;
  getSelectedText(): Promise<string>;

  // Clipboard APIs
  writeToClipboard(text: string): Promise<void>;
  readFromClipboard(): Promise<string>;

  // Storage APIs
  getStorage(key: string): Promise<any>;
  setStorage(key: string, value: any): Promise<void>;

  // Network APIs
  fetch(url: string, options?: RequestInit): Promise<Response>;

  // Service APIs
  gmail: GmailAPI;
  calendar: CalendarAPI;
  autofill: AutofillAPI;
}
```

---

## 🔧 Built-in Skills

### 1. Gmail Skill

**Manifest**:

```json
{
  "id": "regen-gmail",
  "name": "Gmail Integration",
  "version": "1.0.0",
  "permissions": ["api:gmail", "read:page", "read:selection"],
  "actions": [
    {
      "id": "compose-email",
      "name": "Compose Email",
      "trigger": "page-action",
      "handler": "gmail/compose"
    },
    {
      "id": "draft-from-page",
      "name": "Create Draft from Page",
      "trigger": "voice-command",
      "handler": "gmail/draft"
    }
  ]
}
```

**Actions**:

- **Compose Email**: Open Gmail compose with context
- **Draft from Page**: Extract page content → Gmail draft
- **Schedule Email**: Create draft with scheduled send

**Implementation**: `src/skills/gmail/index.ts`

---

### 2. Calendar Skill

**Manifest**:

```json
{
  "id": "regen-calendar",
  "name": "Google Calendar Integration",
  "version": "1.0.0",
  "permissions": ["api:calendar", "read:page"],
  "actions": [
    {
      "id": "create-event",
      "name": "Create Calendar Event",
      "trigger": "page-action",
      "handler": "calendar/create"
    },
    {
      "id": "schedule-meeting",
      "name": "Schedule Meeting from Page",
      "trigger": "voice-command",
      "handler": "calendar/schedule"
    }
  ]
}
```

**Actions**:

- **Create Event**: Quick event creation
- **Schedule Meeting**: Extract meeting details from page → Calendar event
- **Find Free Time**: Check calendar availability

**Implementation**: `src/skills/calendar/index.ts`

---

### 3. Autofill Skill

**Manifest**:

```json
{
  "id": "regen-autofill",
  "name": "Intelligent Autofill",
  "version": "1.0.0",
  "permissions": ["read:page", "storage:read", "storage:write"],
  "actions": [
    {
      "id": "fill-form",
      "name": "Fill Form",
      "trigger": "auto-detect",
      "handler": "autofill/fill"
    },
    {
      "id": "save-profile",
      "name": "Save Profile Data",
      "trigger": "manual",
      "handler": "autofill/save"
    }
  ]
}
```

**Actions**:

- **Fill Form**: Auto-detect form → fill with saved data
- **Save Profile**: Save form data for future use
- **Fill Resume**: Fill job application forms
- **Fill Address**: Auto-fill address fields

**Implementation**: `src/skills/autofill/index.ts`

---

## 🎨 Skill UI Components

### 1. Skill Manager UI

**Location**: `src/components/skills/SkillManager.tsx`

**Features**:

- List installed skills
- Enable/disable skills
- Configure skill settings
- View skill permissions
- Uninstall skills

---

### 2. Page Action Menu

**Location**: `src/components/skills/PageActionMenu.tsx`

**Features**:

- Floating action menu on pages
- Context-aware skill suggestions
- Quick actions (Gmail, Calendar, etc.)
- Custom skill actions

---

### 3. Skill Settings Panel

**Location**: `src/components/skills/SkillSettings.tsx`

**Features**:

- OAuth authentication (Gmail, Calendar)
- Permission management
- Skill configuration
- Usage statistics

---

## 📡 Service Integrations

### Gmail API Integration

**OAuth Flow**:

1. User clicks "Connect Gmail" in skill settings
2. Redirect to Google OAuth consent screen
3. User grants permissions
4. Receive access token + refresh token
5. Store encrypted tokens in IndexedDB
6. Use tokens for API calls

**API Endpoints Used**:

- `gmail.users.messages.send` - Send email
- `gmail.users.drafts.create` - Create draft
- `gmail.users.messages.list` - List emails (optional)

**Implementation**: `src/services/integrations/gmail.ts`

---

### Calendar API Integration

**OAuth Flow**: Same as Gmail

**API Endpoints Used**:

- `calendar.events.insert` - Create event
- `calendar.events.list` - List events (optional)
- `calendar.freebusy.query` - Check availability

**Implementation**: `src/services/integrations/calendar.ts`

---

## 🔒 Security Considerations

### 1. Permission Model

- Skills request specific permissions
- User must approve permissions
- Permissions can be revoked
- Audit log of permission usage

### 2. Sandbox Isolation

- Skills cannot access browser internals
- All APIs are mediated
- No direct DOM manipulation
- Resource limits enforced

### 3. Data Security

- OAuth tokens encrypted at rest
- No credential storage in plain text
- Secure API communication (HTTPS only)
- User data privacy respected

### 4. Rate Limiting

- API calls rate-limited per skill
- Prevents abuse
- Quotas configurable per skill
- Monitoring and alerts

---

## 💾 Storage Architecture

### Skill Storage (IndexedDB)

```typescript
interface SkillStorage {
  skills: {
    [skillId: string]: {
      manifest: SkillManifest;
      enabled: boolean;
      settings: any;
      installedAt: number;
      lastUsed: number;
    };
  };
  permissions: {
    [skillId: string]: Permission[];
  };
  credentials: {
    [skillId: string]: EncryptedCredential;
  };
  usage: {
    [skillId: string]: UsageStats;
  };
}
```

---

## 🚀 Skill Development SDK

### Creating a Custom Skill

**Step 1: Create Manifest**

```json
{
  "id": "my-skill",
  "name": "My Custom Skill",
  "version": "1.0.0",
  "description": "Does awesome things",
  "permissions": ["read:page"],
  "actions": [
    {
      "id": "my-action",
      "name": "My Action",
      "handler": "my-skill/action"
    }
  ]
}
```

**Step 2: Implement Handler**

```typescript
// src/skills/my-skill/index.ts
export async function action(context: SkillContext) {
  const pageContent = await skillAPI.getPageContent();
  // Do something with pageContent
  return { success: true, result: 'Done!' };
}
```

**Step 3: Register Skill**

```typescript
import { skillRegistry } from '@/services/skills/registry';
import manifest from './manifest.json';

skillRegistry.install(manifest);
```

---

## 📊 Performance Considerations

### Lazy Loading

- Skills loaded on-demand
- Only enabled skills loaded
- Code splitting per skill

### Caching

- Skill manifests cached
- API responses cached (when appropriate)
- OAuth tokens cached

### Resource Limits

- Execution timeout: 30s
- Memory limit: 50MB per skill
- API rate limits enforced

---

## 🧪 Testing Strategy

### Unit Tests

- Skill registry operations
- Permission checking
- API mediation
- Security sandbox

### Integration Tests

- Skill installation flow
- OAuth flows
- Action execution
- Error handling

### Manual Testing

- Real Gmail/Calendar integration
- Page action detection
- User experience flows

---

## 📈 Future Enhancements

### Phase 2 (Post-Sprint)

- Skill marketplace
- Skill discovery UI
- Skill ratings/reviews
- Skill analytics

### Phase 3 (Long-term)

- Visual skill builder
- AI-powered skill generation
- Community-contributed skills
- Skill templates

---

## 📝 API Reference

### Skill Registry API

```typescript
// Install skill
await skillRegistry.install(manifest);

// Get skill
const skill = skillRegistry.get('skill-id');

// Enable skill
await skillRegistry.enable('skill-id');

// Disable skill
await skillRegistry.disable('skill-id');

// Uninstall skill
await skillRegistry.uninstall('skill-id');
```

### Skill Execution API

```typescript
// Execute action
const result = await skillEngine.execute('skill-id', 'action-id', {
  pageUrl: window.location.href,
  pageContent: document.body.innerText,
  selectedText: window.getSelection().toString(),
});
```

### Skill API (Inside Skills)

```typescript
// Get page content
const content = await skillAPI.getPageContent();

// Write to clipboard
await skillAPI.writeToClipboard('text');

// Gmail API
await skillAPI.gmail.compose({
  to: 'user@example.com',
  subject: 'Subject',
  body: 'Body',
});

// Calendar API
await skillAPI.calendar.createEvent({
  summary: 'Meeting',
  start: new Date(),
  end: new Date(),
});
```

---

**End of Architecture Document**

_Generated: December 2025_  
_Version: 1.0_  
_Next Steps: Implementation (Days 6-10 of Sprint)_
