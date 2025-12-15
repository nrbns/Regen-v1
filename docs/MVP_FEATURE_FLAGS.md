# MVP Week 1 Feature Flags

**Status**: All MVP features enabled by default  
**Date**: December 13, 2025

## Overview

MVP features are controlled via the `mvpFeatureFlags` configuration. All features are **enabled by default** for the week 1 launch.

## Feature Flags

### Performance Features

#### `tabHibernation`
- **Status**: ✅ Enabled
- **Description**: Automatically suspend inactive browser tabs to save memory and battery
- **Inactivity Timeout**: 30 minutes
- **Auto-wired**: Yes (in `src/main.tsx`)
- **Files**: 
  - [src/services/tabHibernation/init.ts](../src/services/tabHibernation/init.ts)
  - [src/main.tsx](../src/main.tsx#L47)

#### `lowRamMode`
- **Status**: ✅ Enabled
- **Description**: Dynamically cap open tabs based on available system memory
- **Auto-enforced**: Via Redix config
- **Files**:
  - [src/state/tabsStore.ts](../src/state/tabsStore.ts) — `canAdd()` guard
  - [src/components/layout/TabStrip.tsx](../src/components/layout/TabStrip.tsx) — Toast warning

#### `batteryAwarePower`
- **Status**: ✅ Enabled
- **Description**: Automatically enable Power Saving Mode when on battery
- **Auto-mode**: Enabled in AppShell
- **Files**:
  - [src/core/redix/power-auto.ts](../src/core/redix/power-auto.ts)
  - [src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx#L1337)

### UI Features

#### `regenSidebarToggle`
- **Status**: ✅ Enabled
- **Description**: Toggle Regen AI sidebar with keyboard shortcut or button
- **Controls**:
  - **Button**: TopRight cluster (purple highlight when open)
  - **Shortcut**: Ctrl+B
- **Files**:
  - [src/ui/components/top-right/TopRightCluster.tsx](../src/ui/components/top-right/TopRightCluster.tsx)
  - [src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx#L529)

#### `minimalAddressBar`
- **Status**: ✅ Enabled
- **Description**: Minimal navigation controls in address bar (back/forward/reload)
- **Controls**: Back, Forward, Reload buttons
- **Files**:
  - [src/ui/components/TopBar.tsx](../src/ui/components/TopBar.tsx#L156)

#### `keyboardShortcuts`
- **Status**: ✅ Enabled
- **Description**: Comprehensive keyboard shortcuts for tab and UI management
- **Shortcuts**:
  - Tab: Ctrl+T (new), Ctrl+W (close), Ctrl+Shift+T (reopen)
  - Navigation: Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1–9
  - UI: Ctrl+K, Ctrl+Shift+K, Ctrl+Shift+M, Ctrl+Shift+R, Ctrl+Shift+L
  - Sidebar: Ctrl+B
- **Files**:
  - [src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx#L1545)

## Usage

### Get All Flags

```typescript
import { getMVPFeatureFlags } from '@/config/mvpFeatureFlags';

const flags = getMVPFeatureFlags();
console.log(flags.tabHibernation.enabled); // true
```

### Check Specific Feature

```typescript
import { isMVPFeatureEnabled } from '@/config/mvpFeatureFlags';

if (isMVPFeatureEnabled('tabHibernation')) {
  // Use tab hibernation
}
```

### Get Feature Description

```typescript
import { getMVPFeatureDescription } from '@/config/mvpFeatureFlags';

const desc = getMVPFeatureDescription('batteryAwarePower');
// "Automatically enable Power Saving Mode when on battery"
```

## Configuration

### Environment Override (Future)

Features can be disabled via environment variables:

```bash
# Disable tab hibernation
VITE_DISABLE_TAB_HIBERNATION=1 npm run dev

# Disable low-RAM mode
VITE_DISABLE_LOW_RAM_MODE=1 npm run dev
```

*(Implementation optional for week 1)*

### User Settings Override (Future)

Users can toggle features in settings:

```typescript
// In SettingsStore
toggleFeature('tabHibernation'); // Disable hibernation
toggleFeature('batteryAwarePower'); // Disable auto power mode
```

*(Implementation optional for week 1)*

## Testing

Run integration tests:

```bash
npm run test:unit -- src/__tests__/mvp-ui-controls.test.ts
```

See [src/__tests__/mvp-ui-controls.test.ts](../src/__tests__/mvp-ui-controls.test.ts) for test cases.

## Telemetry & Metrics

When features are used, they trigger telemetry:

- **Tab hibernation**: Number of suspended tabs, memory saved
- **Low-RAM mode**: Auto-cap triggers, tabs rejected
- **Battery mode**: Auto-mode switches, power savings
- **UI controls**: Sidebar toggle frequency, address bar usage, shortcut popularity

*(Telemetry logging optional for week 1)*

## Deprecation & Removal

No deprecation planned for week 1. All features are core to the MVP.

---

**Owner**: MVP Week 1  
**Last Updated**: December 13, 2025
