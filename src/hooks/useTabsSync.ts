/**
 * useTabsSync - Sync tabs from Rust (source of truth)
 *
 * This hook keeps Zustand cache in sync with Rust backend.
 * Rust owns the state, Zustand is just a UI cache.
 */

import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../lib/env';
import { useTabsStore, type Tab } from '../state/tabsStore';

/**
 * Sync tabs from Rust backend to Zustand cache
 */
async function syncTabsFromRust() {
  if (!isTauriRuntime()) {
    return; // Skip if not in Tauri
  }

  try {
    // Get tabs from Rust
    const tabs = await invoke<any[]>('tabs:list');
    const activeTab = await invoke<any | null>('tabs:get_active');

    // Convert Rust tab format to frontend Tab format
    // Rust returns (camelCase via serde): { id, url, title, favicon?, createdAt, lastActiveAt, active, pinned, sleeping, privacyMode (string), appMode (string) }
    const frontendTabs = tabs.map((rustTab: any) => ({
      id: rustTab.id,
      title: rustTab.title || 'New Tab',
      url: rustTab.url || 'about:blank',
      active: rustTab.active || false,
      favicon: rustTab.favicon || undefined,
      mode: ((rustTab.privacyMode || 'normal') === 'normal'
        ? 'normal'
        : rustTab.privacyMode === 'private'
          ? 'private'
          : 'ghost') as 'normal' | 'private' | 'ghost',
      appMode: (rustTab.appMode || 'Browse') as Tab['appMode'],
      createdAt: rustTab.createdAt || rustTab.created_at || Date.now(),
      lastActiveAt: rustTab.lastActiveAt || rustTab.last_active_at || Date.now(),
      sleeping: rustTab.sleeping || false,
      pinned: rustTab.pinned || false,
    }));

    // Update Zustand cache (not source of truth, just cache)
    useTabsStore.setState({
      tabs: frontendTabs,
      activeId: activeTab?.id || frontendTabs.find(t => t.active)?.id || null,
    });
  } catch (error) {
    console.error('[useTabsSync] Failed to sync tabs from Rust:', error);
  }
}

/**
 * Hook to keep tabs in sync with Rust backend
 *
 * - Syncs on mount
 * - Syncs periodically (every 5 seconds)
 * - Can be triggered manually via returned function
 */
export function useTabsSync() {
  const syncTabs = useCallback(() => {
    syncTabsFromRust();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return; // Skip if not in Tauri
    }

    // Sync on mount
    syncTabs();

    // Sync periodically (every 5 seconds)
    const interval = setInterval(syncTabs, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [syncTabs]);

  return { syncTabs };
}
