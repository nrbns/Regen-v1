/**
 * DAY 3 LAUNCH FIX: Global Shortcuts & App Integration
 *
 * Enables:
 * 1. Ctrl+Space (Cmd+Space on macOS) to wake app from anywhere
 * 2. Smooth app activation on key press
 * 3. Persistent hotkey registration across sessions
 */

/**
 * Initialize global shortcuts for app wake
 */
export async function initializeGlobalShortcuts(): Promise<{
  registered: boolean;
  error?: string;
}> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');

    // Initialize backend global shortcut service
    await invoke('initialize_global_shortcuts');
    console.log('[DAY3] Global shortcuts initialized');

    return { registered: true };
  } catch (error) {
    console.warn('[DAY3] Global shortcuts not available (web mode):', error);
    return {
      registered: false,
      error: error instanceof Error ? error.message : 'Global shortcuts unavailable',
    };
  }
}

/**
 * Bring app window to foreground
 * Works only in Tauri desktop context
 */
export async function bringAppToForeground(): Promise<boolean> {
  try {
    // Check if running in Tauri
    if (typeof window === 'undefined' || !('__TAURI__' in (window as any))) {
      return false;
    }

    // Use Tauri invoke to bring window to foreground
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('bring_window_to_foreground');
    return true;
  } catch (error) {
    console.warn('[DAY3] Could not bring window to foreground:', error);
    return false;
  }
}

/**
 * Get app version for installer validation
 */
export async function getAppVersion(): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const version = await invoke('get_app_version');
    return version as string;
  } catch {
    return '0.3.0';
  }
}

/**
 * Check if running in production (installer)
 */
export function isProductionBuild(): boolean {
  return import.meta.env.PROD && !import.meta.env.DEV;
}

/**
 * Initialize all Day 3 features on app startup
 */
export async function initializeDay3Features(): Promise<void> {
  try {
    // Register global shortcuts
    const shortcuts = await initializeGlobalShortcuts();
    if (shortcuts.registered) {
      console.log('[DAY3] ✅ Global shortcuts ready (Ctrl+Space)');
    }

    // Check if production build
    const isProd = isProductionBuild();
    console.log('[DAY3] Build:', isProd ? '🏭 PRODUCTION' : '🔧 DEVELOPMENT');

    // Get app version for diagnostics
    const version = await getAppVersion();
    console.log('[DAY3] App Version:', version);
  } catch (error) {
    console.error('[DAY3] Feature initialization failed:', error);
  }
}
