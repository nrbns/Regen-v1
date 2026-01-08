/**
 * SPRINT 2: Workspace Keyboard Shortcuts Hook
 * Handles Cmd+1, Cmd+2, etc. for workspace switching
 */

import { useEffect } from 'react';
import { useWorkspacesStore } from '../state/workspacesStore';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { toast } from '../utils/toast';

export function useWorkspaceShortcuts() {
  const workspaces = useWorkspacesStore(state => state.workspaces);
  const getWorkspace = useWorkspacesStore(state => state.get);
  const tabsStore = useTabsStore();
  const setMode = useAppStore(state => state.setMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + number (1-9)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && !e.shiftKey && !e.altKey) {
        const key = e.key;
        const num = parseInt(key);

        // Check if it's a number key (1-9)
        if (num >= 1 && num <= 9) {
          e.preventDefault();

          // Get pinned workspaces first, then regular ones
          const sortedWorkspaces = [...workspaces].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
          });

          const workspaceIndex = num - 1;
          if (workspaceIndex < sortedWorkspaces.length) {
            const workspace = sortedWorkspaces[workspaceIndex];
            switchToWorkspace(workspace.id);
          } else {
            toast.info(`No workspace at position ${num}. Create one to use this shortcut.`);
          }
        }
      }
    };

    const switchToWorkspace = async (workspaceId: string) => {
      const workspace = getWorkspace(workspaceId);
      if (!workspace) {
        toast.error('Workspace not found');
        return;
      }

      try {
        // Switch to workspace mode
        setMode(workspace.mode);

        // Clear current tabs
        const currentTabs = tabsStore.tabs;
        for (const tab of currentTabs) {
          tabsStore.remove(tab.id);
        }

        // Restore workspace tabs
        for (const tab of workspace.tabs) {
          tabsStore.add(tab);
        }

        // Set first tab as active
        if (workspace.tabs.length > 0) {
          tabsStore.setActive(workspace.tabs[0].id);
        }

        toast.success(`Switched to workspace: ${workspace.name}`);
      } catch (error) {
        console.error('Failed to switch workspace:', error);
        toast.error('Failed to switch workspace');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [workspaces, getWorkspace, tabsStore, setMode]);
}
