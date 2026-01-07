/**
 * SPRINT 2: Workspace Memory Caps
 * Enforces per-workspace memory limits
 */

import { useWorkspacesStore, type Workspace } from '../../state/workspacesStore';
import { useTabsStore as _useTabsStore } from '../../state/tabsStore';
import { getMemoryUsage } from '../../core/monitoring/memoryMonitor';

const DEFAULT_MEMORY_CAP_MB = 200; // Default 200MB per workspace

interface WorkspaceMemoryInfo {
  workspaceId: string;
  memoryMB: number;
  capMB: number;
  usagePercent: number;
  tabs: number;
}

/**
 * Get memory usage for a workspace
 */
export function getWorkspaceMemoryUsage(workspace: Workspace): number {
  // Estimate memory: ~50MB base + 100MB per tab
  const baseMemoryMB = 50;
  const perTabMemoryMB = 100;
  const estimatedMemoryMB = baseMemoryMB + workspace.tabs.length * perTabMemoryMB;

  // If we have actual memory monitoring, use it
  const actualMemory = getMemoryUsage();
  if (actualMemory && actualMemory.rss) {
    // Use actual RSS if available, but divide by workspace count as approximation
    const workspaceCount = useWorkspacesStore.getState().workspaces.length || 1;
    return actualMemory.rss / (1024 * 1024) / workspaceCount;
  }

  return estimatedMemoryMB;
}

/**
 * Check if workspace exceeds memory cap
 */
export function workspaceExceedsCap(
  workspace: Workspace,
  capMB: number = DEFAULT_MEMORY_CAP_MB
): boolean {
  const usage = getWorkspaceMemoryUsage(workspace);
  return usage > capMB;
}

/**
 * Get memory info for all workspaces
 */
export function getAllWorkspaceMemoryInfo(): WorkspaceMemoryInfo[] {
  const workspaces = useWorkspacesStore.getState().workspaces;

  return workspaces.map(workspace => {
    const usage = getWorkspaceMemoryUsage(workspace);
    const cap = (workspace as any).memoryCapMB || DEFAULT_MEMORY_CAP_MB;

    return {
      workspaceId: workspace.id,
      memoryMB: usage,
      capMB: cap,
      usagePercent: (usage / cap) * 100,
      tabs: workspace.tabs.length,
    };
  });
}

/**
 * Auto-suspend tabs in workspace if memory cap exceeded
 */
export async function enforceWorkspaceMemoryCap(workspaceId: string): Promise<number> {
  const workspace = useWorkspacesStore.getState().get(workspaceId);
  if (!workspace) return 0;

  const capMB = (workspace as any).memoryCapMB || DEFAULT_MEMORY_CAP_MB;

  if (!workspaceExceedsCap(workspace, capMB)) {
    return 0; // Within limits
  }

  // Suspend oldest tabs until under cap
  const { hibernateTab } = await import('../tabHibernation/hibernationManager');
  const sortedTabs = [...workspace.tabs].sort(
    (a, b) => (a.lastActiveAt || 0) - (b.lastActiveAt || 0)
  );

  let suspendedCount = 0;
  for (const tab of sortedTabs) {
    if (workspaceExceedsCap(workspace, capMB)) {
      await hibernateTab(tab.id);
      suspendedCount++;
    } else {
      break;
    }
  }

  return suspendedCount;
}
