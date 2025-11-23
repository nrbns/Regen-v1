/**
 * TabContextMenu - Right-click menu for tab actions (Ghost, Burn, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ghost,
  Flame,
  Clock,
  Copy,
  Boxes,
  Eye,
  Sun,
  MoonStar,
  Layers,
  FolderPlus,
  Check,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useProfileStore } from '../../state/profileStore';
import { useContainerStore } from '../../state/containerStore';
import { ContainerInfo } from '../../lib/ipc-events';
import { useTabsStore } from '../../state/tabsStore';
import { usePeekPreviewStore } from '../../state/peekStore';

interface TabContextMenuProps {
  tabId: string;
  url: string;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  mode?: 'normal' | 'ghost' | 'private';
  sleeping?: boolean;
  onClose: () => void;
}

export function TabContextMenu({
  tabId,
  url,
  containerId,
  containerName,
  containerColor,
  mode,
  sleeping,
  onClose,
}: TabContextMenuProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const policy = useProfileStore(state => state.policies[state.activeProfileId]);
  const ghostDisabled = policy ? !policy.allowGhostTabs : false;
  const privateDisabled = policy ? !policy.allowPrivateWindows : false;
  const { containers, setContainers } = useContainerStore(state => ({
    containers: state.containers,
    setContainers: state.setContainers,
  }));
  const tab = useTabsStore(state => state.tabs.find(t => t.id === tabId));
  const tabGroups = useTabsStore(state => state.tabGroups);
  const assignTabToGroup = useTabsStore(state => state.assignTabToGroup);
  const createGroup = useTabsStore(state => state.createGroup);
  const openPeek = usePeekPreviewStore(state => state.open);
  const isSleeping = sleeping ?? tab?.sleeping ?? false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const storedPos = (window as any).__lastContextMenuPos || { x: 0, y: 0 };
    setPosition({ x: storedPos.x, y: storedPos.y });
  }, []);

  useEffect(() => {
    if (containers.length === 0) {
      ipc.containers
        .list()
        .then(list => {
          if (Array.isArray(list)) {
            setContainers(list as ContainerInfo[]);
          }
        })
        .catch(error => {
          console.error('Failed to load containers for context menu:', error);
        });
    }
  }, [containers.length, setContainers]);

  const resolveTab = () => ({
    id: tab?.id ?? tabId,
    title: tab?.title ?? tab?.url ?? url ?? 'New Tab',
    url: tab?.url ?? url ?? 'about:blank',
    containerId: tab?.containerId ?? containerId,
    containerName: tab?.containerName ?? containerName,
    containerColor: tab?.containerColor ?? containerColor,
    mode: tab?.mode ?? mode,
    createdAt: tab?.createdAt,
    lastActiveAt: tab?.lastActiveAt,
    sessionId: tab?.sessionId,
    profileId: tab?.profileId,
    sleeping: tab?.sleeping ?? sleeping ?? false,
  });

  const handleAssignGroup = (groupId: string | null) => {
    assignTabToGroup(tabId, groupId);
    onClose();
  };

  const handleCreateGroup = () => {
    const name = window.prompt('New group name', `Group ${tabGroups.length + 1}`)?.trim();
    const group = createGroup({ name: name || undefined });
    assignTabToGroup(tabId, group.id);
    onClose();
  };

  const handleOpenAsGhost = async () => {
    if (ghostDisabled) return;
    try {
      await ipc.private.createGhostTab({ url });
      onClose();
    } catch (error) {
      console.error('Failed to open as ghost:', error);
    }
  };

  const handleBurnTab = async () => {
    try {
      if (confirm('Burn this tab? All data will be permanently deleted.')) {
        await ipc.tabs.burn(tabId);
        onClose();
      }
    } catch (error) {
      console.error('Failed to burn tab:', error);
    }
  };

  const handleStartTimer = async () => {
    if (privateDisabled) return;
    const minutes = prompt('Auto-close after (minutes):', '10');
    if (minutes) {
      try {
        const ms = parseInt(minutes) * 60 * 1000;
        await ipc.private.createWindow({ url, autoCloseAfter: ms });
        onClose();
      } catch (error) {
        console.error('Failed to start timer:', error);
      }
    }
  };

  const handleDuplicate = async (targetContainerId?: string, activate = true) => {
    try {
      await ipc.tabs.create({
        url: url || 'about:blank',
        containerId: targetContainerId ?? containerId,
        activate,
      });
      onClose();
    } catch (error) {
      console.error('Failed to duplicate tab:', error);
    }
  };

  const handleMoveToContainer = async (targetId: string) => {
    if (!targetId || targetId === containerId) {
      onClose();
      return;
    }
    try {
      const result = await ipc.tabs.setContainer(tabId, targetId);
      if (!result?.success) {
        console.warn('Failed to switch container:', result?.error);
      }
    } catch (error) {
      console.error('Failed to switch tab container:', error);
    } finally {
      onClose();
    }
  };

  const handlePeek = () => {
    openPeek(resolveTab());
    onClose();
  };

  const handleWake = async () => {
    try {
      await ipc.tabs.wake(tabId);
      onClose();
    } catch (error) {
      console.error('Failed to wake tab:', error);
    }
  };

  const isGhost = mode === 'ghost';
  const isPrivate = mode === 'private';

  const menuItems = [
    { icon: Eye, label: 'Peek preview', action: handlePeek },
    {
      icon: Copy,
      label: 'Duplicate Tab',
      action: () => handleDuplicate(containerId, true),
      disabled: isGhost || isPrivate,
    },
    {
      icon: Ghost,
      label: 'Open as Ghost',
      action: handleOpenAsGhost,
      hide: isGhost,
      disabled: ghostDisabled,
      disabledReason: 'Disabled by profile policy',
    },
    { icon: Flame, label: 'Burn Tab', action: handleBurnTab, danger: true },
    {
      icon: Clock,
      label: 'Start 10-min Timer',
      action: handleStartTimer,
      disabled: privateDisabled,
      disabledReason: 'Disabled by profile policy',
    },
    {
      icon: Sun,
      label: 'Wake tab',
      action: handleWake,
      hide: !isSleeping,
    },
  ].filter(item => !item.hide);

  const moveTargets =
    !isGhost && !isPrivate ? containers.filter((c: ContainerInfo) => c.id !== containerId) : [];

  const openTargets = containers.filter((c: ContainerInfo) => c.id !== containerId);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-surface-elevated text-foreground border border-subtle rounded-lg shadow-elevated py-1 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {isSleeping && (
          <div className="px-3 py-2 text-xs text-amber-500 bg-amber-500/10 border-b border-subtle flex items-center gap-2">
            <MoonStar size={14} />
            <span>Tab is hibernating</span>
          </div>
        )}

        {(containerId || containerName) && (
          <div className="px-3 py-2 text-xs text-muted border-b border-subtle flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full border border-gray-500/30"
              style={{ backgroundColor: containerColor || '#6366f1' }}
            />
            <span>
              {containerName || (containerId === 'default' ? 'Default container' : containerId)}
            </span>
          </div>
        )}

        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={idx}
              whileHover={item.disabled ? undefined : { scale: 1.01 }}
              onClick={item.action}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.danger
                  ? 'text-red-500 hover:bg-red-500/10'
                  : item.disabled
                    ? 'text-muted cursor-not-allowed'
                    : 'text-foreground hover:bg-[color:var(--surface-muted)]/45'
              }`}
              disabled={item.disabled}
              title={
                item.disabled ? item.disabledReason || 'Disabled by profile policy' : undefined
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </motion.button>
          );
        })}

        {openTargets.length > 0 && (
          <div className="mt-1 border-t border-subtle pt-1.5">
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted flex items-center gap-2">
              <Boxes size={12} />
              Open copy in container
            </div>
            <div className="flex flex-col">
              {openTargets.map(container => (
                <motion.button
                  key={`open-${container.id}`}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleDuplicate(container.id, true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-[color:var(--surface-muted)]/45 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-500/30"
                    style={{ backgroundColor: container.color || '#6366f1' }}
                  />
                  <span className="truncate">{container.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {moveTargets.length > 0 && (
          <div className="mt-1 border-t border-subtle pt-1.5">
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted flex items-center gap-2">
              <Boxes size={12} />
              Move to container
            </div>
            <div className="flex flex-col">
              {moveTargets.map(container => (
                <motion.button
                  key={container.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleMoveToContainer(container.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-[color:var(--surface-muted)]/45 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-500/30"
                    style={{ backgroundColor: container.color || '#6366f1' }}
                  />
                  <span className="truncate">{container.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
        {tabGroups.length > 0 && (
          <div className="mt-1 border-t border-subtle pt-1.5">
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted flex items-center gap-2">
              <Layers size={12} />
              Tab group
            </div>
            <div className="flex flex-col">
              {tabGroups.map(group => (
                <motion.button
                  key={group.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleAssignGroup(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-[color:var(--surface-muted)]/45 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-500/30"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="truncate flex-1">{group.name}</span>
                  {tab?.groupId === group.id && <Check size={12} className="text-emerald-400" />}
                </motion.button>
              ))}
              {tab?.groupId && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleAssignGroup(null)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-[color:var(--surface-muted)]/45 transition-colors"
                >
                  Remove from group
                </motion.button>
              )}
            </div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={handleCreateGroup}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-[color:var(--surface-muted)]/45 transition-colors border-t border-subtle mt-1"
        >
          <FolderPlus size={14} />
          New group
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
