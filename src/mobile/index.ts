/**
 * Mobile Module
 * Centralized exports for all mobile-related functionality
 */

// Components
export { MobileNav } from './components/MobileNav';
export { InstallPrompt } from './components/InstallPrompt';
export { MobileSearchInput } from './components/MobileSearchInput';
export type { MobileSearchInputProps } from './components/MobileSearchInput';
export { MobileDock } from './components/MobileDock';
export { MobileTabBar } from './components/MobileTabBar';
export { MobileModeSwitcher } from './components/MobileModeSwitcher';
export { MobileWISPR } from './components/MobileWISPR';
export { MobileSettingsPanel } from './components/MobileSettingsPanel';
export { SyncStatusIndicator } from './components/SyncStatusIndicator';
export { MobileErrorBoundary } from './components/MobileErrorBoundary';
export { MobileLoadingSpinner } from './components/MobileLoadingSpinner';
export { TouchButton } from './components/TouchButton';
export type { TouchButtonProps } from './components/TouchButton';
export { TouchInput } from './components/TouchInput';
export type { TouchInputProps } from './components/TouchInput';

// Hooks
export { useMobileDetection } from './hooks/useMobileDetection';
export type { DeviceType, BreakpointConfig } from './hooks/useMobileDetection';
export { useSwipeGesture } from './hooks/useSwipeGesture';
export { useMobilePerformance } from './hooks/useMobilePerformance';
export { useApi, useApiMutation } from './hooks/useApi';
export { useRedixQuery, useRedixStream, useEcoScore } from './hooks/useRedix';

// Utils
export { createSwipeHandler } from './utils/swipeGestures';
export type { SwipeGestureConfig } from './utils/swipeGestures';
export {
  preventIOSZoom,
  scrollIntoViewWhenFocused,
  handleViewportResize,
  preventKeyboardDefault,
  safeAutoFocus,
} from './utils/keyboardHandler';
export { mobileApiRequest, checkMobileApiHealth, mobileApi } from './utils/apiClient';
export {
  mobileRedix,
  queryRedix,
  streamRedixQuery,
  checkRedixHealth,
  getEcoScore,
} from './utils/redixClient';
export type { RedixQueryRequest, RedixQueryResponse, EcoScoreRequest } from './utils/redixClient';

// Styles - import in main.tsx
import './styles/mobile.css';
