/**
 * UI Components Index
 * Central export for all reusable UI components
 */

// Shell / Layout
export { OmniShell } from './OmniShell';
export type { OmniShellProps } from './OmniShell';

export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';

export { TabStrip } from './TabStrip';
export type { TabStripProps, Tab, TabGroup } from './TabStrip';

export { SideRail } from './SideRail';
export type { SideRailProps } from './SideRail';

export { RightPanel } from './RightPanel';
export type { RightPanelProps } from './RightPanel';

export { BottomStatusBar } from './BottomStatusBar';
export type { BottomStatusBarProps, SystemStatus } from './BottomStatusBar';

// Modes & Mode System
export { ModeTabs } from './ModeTabs';
export type { ModeTabsProps } from './ModeTabs';

export { ModePreviewCard } from './ModePreviewCard';
export type { ModePreviewCardProps } from './ModePreviewCard';

// Search & Command
export { CommandBar } from './CommandBar';
export type { CommandBarProps, Command } from './CommandBar';

// Top-right cluster
export { TopRightCluster } from './top-right';
export { NotificationsMenu, SettingsMenu, ProfileMenu } from './top-right';
export type { NotificationItem, UserProfile } from './top-right';

// Overlays & Modals
export { OverlayManager } from './OverlayManager';
export type { OverlayManagerProps, Overlay } from './OverlayManager';

// Notifications
export { Toast, ToastContainer } from './Toast';
export type {
  ToastProps,
  ToastContainerProps,
  Toast as ToastType,
  ToastType as ToastTypeEnum,
} from './Toast';

// Utilities
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

// Form Controls
export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';

export { Switch } from './Switch';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';
