/**
 * Iframe Blocked Fallback Handler - PR: Fix tab switch null issues
 * Handles X-Frame-Options blocking by opening URL in main Tauri webview or external browser
 */

import { isTauriRuntime } from '../lib/env';
import { invoke } from '@tauri-apps/api/core';

/**
 * Handle iframe blocked event - open URL in main webview or external browser
 */
export async function handleIframeBlocked(tabId: string, url: string): Promise<void> {
  console.log('[IframeBlockedFallback] Handling blocked iframe', { tabId, url });

  if (isTauriRuntime()) {
    try {
      // Option 1: Emit event to navigate main Tauri webview to the URL
      // The Tauri backend will emit an event that we listen to
      await invoke('navigate_main_webview', { url });
      console.log('[IframeBlockedFallback] Emitted navigation event');
    } catch (error) {
      console.warn(
        '[IframeBlockedFallback] Failed to open in main webview, trying external browser',
        error
      );

      // Option 2: Fallback to external browser
      try {
        await invoke('open_external', { url });
        console.log('[IframeBlockedFallback] Opened in external browser');
      } catch (extError) {
        console.error('[IframeBlockedFallback] Failed to open in external browser', extError);
        // Last resort: use window.open (may be blocked by popup blockers)
        window.open(url, '_blank');
      }
    }
  } else {
    // Web/Electron: open in new window or external browser
    window.open(url, '_blank');
  }
}

/**
 * Setup global listener for iframe-blocked events
 */
export function setupIframeBlockedListener(): () => void {
  const handler = (event: CustomEvent<{ tabId: string; url: string }>) => {
    handleIframeBlocked(event.detail.tabId, event.detail.url);
  };

  window.addEventListener('iframe-blocked', handler as EventListener);

  return () => {
    window.removeEventListener('iframe-blocked', handler as EventListener);
  };
}
