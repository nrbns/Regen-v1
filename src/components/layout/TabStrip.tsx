/**
 * TabStrip - Floating tab bar with Arc-like design
 * Fully functional tab management with real-time updates
 */

// @ts-nocheck

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Eye,
  Sparkles,
  RotateCcw,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  Palette,
  Trash2,
  Edit3,
  FolderPlus,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import {
  useTabsStore,
  type ClosedTab,
  type TabGroup,
  TAB_GROUP_COLORS,
} from '../../state/tabsStore';
import { useContainerStore } from '../../state/containerStore';
import { useAppStore } from '../../state/appStore';
import { ipcEvents } from '../../lib/ipc-events';
import { TabHoverCard } from '../TopNav/TabHoverCard';
import { ContainerQuickSelector } from '../containers/ContainerQuickSelector';
import { TabContextMenu } from './TabContextMenu';
import { usePeekPreviewStore } from '../../state/peekStore';
import { Portal } from '../common/Portal';
import { useTabGraphStore } from '../../state/tabGraphStore';
import { PredictiveClusterChip, PredictivePrefetchHint } from './PredictiveClusterChip';
import { HolographicPreviewOverlay } from '../hologram';
import { isDevEnv, isElectronRuntime } from '../../lib/env';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { reopenClosedTab } from '../../lib/tabLifecycle';
import {
  saveTabForResurrection,
  scheduleAutoResurrection,
  RESURRECTION_DELAY_MS,
} from '../../core/tabs/resurrection';
import { useAppError } from '../../hooks/useAppError';

const TAB_GRAPH_DRAG_MIME = 'application/x-regen-tab-id';
const IS_DEV = isDevEnv();
const IS_ELECTRON = isElectronRuntime();
const NEW_GROUP_DROP_ID = '__new-tab-group__';

const stopEventPropagation = (event: { stopPropagation?: () => void; nativeEvent?: Event }) => {
  event?.stopPropagation?.();
  const native = event?.nativeEvent as { stopImmediatePropagation?: () => void } | undefined;
  native?.stopImmediatePropagation?.();
};

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  mode?: 'normal' | 'ghost' | 'private';
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  createdAt?: number;
  lastActiveAt?: number;
  sessionId?: string;
  profileId?: string;
  sleeping?: boolean;
  pinned?: boolean;
  groupId?: string;
}

const mapTabsForStore = (list: Tab[]) =>
  list.map(t => ({
    id: t.id,
    title: t.title,
    active: t.active,
    url: t.url,
    mode: t.mode,
    containerId: t.containerId,
    containerColor: t.containerColor,
    containerName: t.containerName,
    createdAt: t.createdAt,
    lastActiveAt: t.lastActiveAt,
    sessionId: t.sessionId,
    profileId: t.profileId,
    sleeping: t.sleeping,
    pinned: t.pinned,
    groupId: t.groupId,
  }));

export function TabStrip() {
  const { handleError: _handleError } = useAppError();
  const setAllTabs = useTabsStore(state => state.setAll);
  const setActiveTab = useTabsStore(state => state.setActive);
  const activeId = useTabsStore(state => state.activeId);
  const storeTabs = useTabsStore(state => state.tabs);

  // Defensive: Ensure tabs is always an array
  const safeTabs = Array.isArray(storeTabs) ? storeTabs : [];
  const updateTab = useTabsStore(state => state.updateTab);
  const rememberClosedTab = useTabsStore(state => state.rememberClosedTab);
  const recentlyClosed = useTabsStore(state => state.recentlyClosed);
  const togglePinTab = useTabsStore(state => state.togglePinTab);
  const tabGroups = useTabsStore(state => state.tabGroups);
  const createGroup = useTabsStore(state => state.createGroup);
  const deleteGroup = useTabsStore(state => state.deleteGroup);
  const toggleGroupCollapsed = useTabsStore(state => state.toggleGroupCollapsed);
  const setGroupColor = useTabsStore(state => state.setGroupColor);
  const assignTabToGroup = useTabsStore(state => state.assignTabToGroup);
  const updateGroup = useTabsStore(state => state.updateGroup);
  const { activeContainerId } = useContainerStore();
  const { mode: currentMode } = useAppStore();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [predictedClusters, setPredictedClusters] = useState<
    Array<{ id: string; label: string; tabIds: string[]; confidence?: number }>
  >([]);
  const [prefetchEntries, setPrefetchEntries] = useState<
    Array<{ tabId: string; url: string; reason: string; confidence?: number }>
  >([]);
  const [predictionSummary, setPredictionSummary] = useState<string | null>(null);
  const [holographicPreviewTabId, setHolographicPreviewTabId] = useState<string | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<{ url?: string; title?: string } | null>(
    null
  );
  const [hologramSupported, setHologramSupported] = useState<boolean | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<{
    platform: string;
    lastSentAt: number | null;
  }>({ platform: 'desktop', lastSentAt: null });
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    url: string;
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    mode?: 'normal' | 'ghost' | 'private';
    sleeping?: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const isCreatingTabRef = useRef(false); // Prevent infinite tab creation loops
  const previousTabIdsRef = useRef<string>(''); // Track tab IDs to prevent unnecessary updates
  const currentActiveIdRef = useRef<string | null>(null); // Track active ID without causing re-renders
  const activationInFlightRef = useRef<string | null>(null); // Track activations to avoid duplicate work
  const [groupDragTarget, setGroupDragTarget] = useState<string | null>(null);
  const groupMap = useMemo(() => {
    const map = new Map<string, TabGroup>();
    tabGroups.forEach(group => {
      map.set(group.id, group);
    });
    return map;
  }, [tabGroups]);

  const handleRenameGroup = useCallback(
    (group: TabGroup) => {
      const nextName = window.prompt('Rename group', group.name);
      if (!nextName) return;
      const trimmed = nextName.trim();
      if (!trimmed || trimmed === group.name) return;
      updateGroup(group.id, { name: trimmed });
    },
    [updateGroup]
  );

  const handleCycleGroupColor = useCallback(
    (group: TabGroup) => {
      const currentIndex = TAB_GROUP_COLORS.findIndex(color => color === group.color);
      const nextColor = TAB_GROUP_COLORS[(currentIndex + 1) % TAB_GROUP_COLORS.length];
      setGroupColor(group.id, nextColor);
    },
    [setGroupColor]
  );

  const handleDeleteGroup = useCallback(
    (group: TabGroup) => {
      if (window.confirm(`Remove group "${group.name}"? Tabs will remain open.`)) {
        deleteGroup(group.id);
      }
    },
    [deleteGroup]
  );

  const handleGroupDrop = useCallback(
    (groupId: string) => {
      if (!draggedTabIdRef.current) return;
      assignTabToGroup(draggedTabIdRef.current, groupId);
      draggedTabIdRef.current = null;
      dragOverIndexRef.current = null;
      setGroupDragTarget(null);
    },
    [assignTabToGroup]
  );

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    if (!draggedTabIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setGroupDragTarget(groupId);
  }, []);

  const handleGroupDragLeave = useCallback((groupId: string) => {
    setGroupDragTarget(current => (current === groupId ? null : current));
  }, []);

  const handleCreateGroupShortcut = useCallback(
    (name?: string) => {
      const group = createGroup({ name });
      return group;
    },
    [createGroup]
  );

  const handleDropToNewGroup = useCallback(() => {
    if (!draggedTabIdRef.current) return;
    const group = createGroup({});
    assignTabToGroup(draggedTabIdRef.current, group.id);
    draggedTabIdRef.current = null;
    dragOverIndexRef.current = null;
    setGroupDragTarget(null);
  }, [assignTabToGroup, createGroup]);

  const renderGroupHeader = (group: TabGroup) => (
    <div
      key={`group-${group.id}`}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-300 uppercase tracking-wide ${
        groupDragTarget === group.id
          ? 'border-blue-500/70 bg-blue-500/10 text-blue-200'
          : 'border-gray-800/60 bg-gray-900/40'
      }`}
      onDragOver={e => handleGroupDragOver(e, group.id)}
      onDragLeave={() => handleGroupDragLeave(group.id)}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        handleGroupDrop(group.id);
      }}
    >
      <button
        type="button"
        onClick={e => {
          stopEventPropagation(e);
          toggleGroupCollapsed(group.id);
        }}
        onMouseDown={e => {
          stopEventPropagation(e);
        }}
        className="p-1 rounded hover:bg-gray-800/60 transition-colors text-gray-300 hover:text-gray-100"
        style={{ zIndex: 10011, isolation: 'isolate' }}
        title={group.collapsed ? 'Expand group' : 'Collapse group'}
      >
        {group.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20"
          style={{ backgroundColor: group.color }}
          title={`Group color: ${group.color}`}
        />
        <button
          type="button"
          onClick={e => {
            stopEventPropagation(e);
            handleRenameGroup(group);
          }}
          onMouseDown={e => {
            stopEventPropagation(e);
          }}
          className="text-[11px] font-semibold text-gray-200 hover:text-white truncate"
          style={{ zIndex: 10011, isolation: 'isolate' }}
          title="Rename group"
        >
          {group.name}
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={e => {
            stopEventPropagation(e);
            handleCycleGroupColor(group);
          }}
          onMouseDown={e => {
            stopEventPropagation(e);
          }}
          className="p-1 rounded hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors"
          style={{ zIndex: 10011, isolation: 'isolate' }}
          title="Cycle group color"
        >
          <Palette size={14} />
        </button>
        <button
          type="button"
          onClick={e => {
            stopEventPropagation(e);
            handleRenameGroup(group);
          }}
          onMouseDown={e => {
            stopEventPropagation(e);
          }}
          className="p-1 rounded hover:bg-gray-800/60 text-gray-300 hover:text-white transition-colors"
          style={{ zIndex: 10011, isolation: 'isolate' }}
          title="Rename group"
        >
          <Edit3 size={14} />
        </button>
        <button
          type="button"
          onClick={e => {
            stopEventPropagation(e);
            handleDeleteGroup(group);
          }}
          onMouseDown={e => {
            stopEventPropagation(e);
          }}
          className="p-1 rounded hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors"
          style={{ zIndex: 10011, isolation: 'isolate' }}
          title="Remove group"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  const renderTabNode = (tab: Tab) => {
    const group = tab.groupId ? groupMap.get(tab.groupId) : null;
    const groupRingStyle = group
      ? {
          boxShadow: `inset 0 0 0 1px ${group.color}40`,
        }
      : undefined;
    const prefetchForTab = prefetchEntries.find(entry => entry.tabId === tab.id);
    return (
      <TabHoverCard key={tab.id} tabId={tab.id}>
        <motion.div
          id={`tab-${tab.id}`}
          data-tab={tab.id}
          role="tab"
          aria-selected={tab.active}
          aria-controls={`tabpanel-${tab.id}`}
          aria-label={`Tab: ${tab.title || 'Untitled'}${tab.mode === 'ghost' ? ' (Ghost tab)' : tab.mode === 'private' ? ' (Private tab)' : ''}${tab.sleeping ? ' (Hibernating)' : ''}${group ? ` (Group: ${group.name})` : ''}`}
          tabIndex={tab.active ? 0 : -1}
          layout={false}
          initial={false}
          animate={false}
          exit={false}
          className={`
            relative flex items-center gap-2 ${tab.pinned ? 'px-2 py-1.5' : 'px-4 py-2'} rounded-lg
            ${tab.pinned ? 'min-w-[40px] max-w-[40px]' : 'min-w-[100px] max-w-[220px]'} cursor-pointer group
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${
              tab.active
                ? 'bg-purple-600/20 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
            }
            ${tab.mode === 'ghost' ? 'ring-1 ring-purple-500/40' : ''}
            ${tab.mode === 'private' ? 'ring-1 ring-emerald-500/40' : ''}
            ${tab.sleeping ? 'ring-1 ring-amber-400/40' : ''}
            ${tab.pinned ? 'border-l-2 border-l-blue-500' : ''}
          `}
          style={{ pointerEvents: 'auto', zIndex: 1, userSelect: 'none', ...groupRingStyle }}
          draggable
          onDragStart={event => {
            try {
              const isGraphDrag = event.ctrlKey || event.metaKey;
              if (isGraphDrag) {
                event.dataTransfer?.setData(TAB_GRAPH_DRAG_MIME, tab.id);
                if (tab.title) {
                  event.dataTransfer?.setData('text/plain', tab.title);
                }
                if (event.dataTransfer) {
                  event.dataTransfer.effectAllowed = 'copy';
                }
              } else {
                draggedTabIdRef.current = tab.id;
                if (event.dataTransfer) {
                  event.dataTransfer.effectAllowed = 'move';
                }
              }
            } catch (error) {
              if (IS_DEV) {
                console.warn('[TabStrip] Drag start failed', error);
              }
            }
          }}
          onDragEnd={() => {
            if (draggedTabIdRef.current === null) {
              window.dispatchEvent(new CustomEvent('tabgraph:dragend'));
            }
            draggedTabIdRef.current = null;
            dragOverIndexRef.current = null;
            setGroupDragTarget(null);
          }}
          onClick={e => {
            e.preventDefault();
            stopEventPropagation(e);
            void activateTab(tab.id);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              activateTab(tab.id);
              return;
            }

            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();

              // Defensive: Use filteredTabs for keyboard navigation
              const validTabs = filteredTabs.filter(t => t && t.id);
              const currentIndex = validTabs.findIndex(t => t.id === tab.id);
              if (currentIndex === -1) {
                return;
              }

              let nextIndex = currentIndex;
              switch (e.key) {
                case 'Home':
                  nextIndex = 0;
                  break;
                case 'End':
                  nextIndex = validTabs.length - 1;
                  break;
                case 'ArrowLeft':
                  nextIndex = (currentIndex - 1 + validTabs.length) % validTabs.length;
                  break;
                case 'ArrowRight':
                  nextIndex = (currentIndex + 1) % validTabs.length;
                  break;
              }

              const nextTab = validTabs[nextIndex];
              if (nextTab && nextTab.id) {
                void activateTab(nextTab.id);
              }
            }
          }}
          onAuxClick={(e: React.MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              stopEventPropagation(e);
              closeTab(tab.id);
            }
          }}
          onContextMenu={e => {
            e.preventDefault();
            (window as any).__lastContextMenuPos = { x: e.clientX, y: e.clientY };
            setContextMenu({
              tabId: tab.id,
              url: tab.url,
              containerId: tab.containerId,
              containerName: tab.containerName,
              containerColor: tab.containerColor,
              mode: tab.mode,
              sleeping: tab.sleeping,
              x: e.clientX,
              y: e.clientY,
            });
          }}
          onMouseEnter={() => {
            // Defensive: Check if tab is last in filteredTabs
            const validFilteredTabs = Array.isArray(filteredTabs)
              ? filteredTabs.filter(t => t && t.id)
              : [];
            if (
              validFilteredTabs.length > 0 &&
              tab === validFilteredTabs[validFilteredTabs.length - 1]
            ) {
              setHolographicPreviewTabId(tab.id);
              setPreviewMetadata({ url: tab.url || '', title: tab.title || 'Untitled' });
            }
          }}
          onMouseLeave={() => {
            if (holographicPreviewTabId === tab.id) {
              setHolographicPreviewTabId(null);
              setPreviewMetadata(null);
            }
          }}
        >
          {prefetchForTab && (
            <span
              className="absolute top-1 right-2 text-emerald-300 text-[11px] font-semibold"
              title={`Suggested follow-up: ${prefetchForTab.reason}`}
            >
              ⚡
            </span>
          )}
          {hologramSupported !== false && holographicPreviewTabId === tab.id && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2"
            >
              <motion.button
                type="button"
                className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[10px] text-cyan-100 shadow-lg backdrop-blur transition-colors hover:bg-cyan-500/25"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHandoffStatus({ platform: 'xr', lastSentAt: Date.now() });
                  window.dispatchEvent(
                    new CustomEvent('tab:holographic-preview', {
                      detail: { tabId: tab.id },
                    })
                  );
                  void ipc.crossReality.handoff(tab.id, 'xr');
                }}
              >
                <Sparkles size={12} /> XR Hologram
              </motion.button>
              <motion.button
                type="button"
                className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] text-amber-100 shadow-lg backdrop-blur transition-colors hover:bg-amber-500/25"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHandoffStatus({ platform: 'mobile', lastSentAt: Date.now() });
                  void ipc.crossReality.handoff(tab.id, 'mobile');
                }}
              >
                <span role="img" aria-label="mobile">
                  📱
                </span>{' '}
                Send
              </motion.button>
            </motion.div>
          )}
          {/* Favicon */}
          <div className="flex-shrink-0 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
            {tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-full h-full rounded-full" />
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
          </div>

          {tab.mode && tab.mode !== 'normal' && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                tab.mode === 'ghost'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              }`}
            >
              {tab.mode === 'ghost' ? 'Ghost' : 'Private'}
            </span>
          )}

          {tab.containerId && tab.containerId !== 'default' && (
            <div
              className="w-2.5 h-2.5 rounded-full border border-gray-700/60"
              style={{ backgroundColor: tab.containerColor || '#6366f1' }}
              title={`${tab.containerName || 'Custom'} container`}
            />
          )}

          {group && (
            <span
              className="w-2 h-2 rounded-full border border-white/20"
              style={{ backgroundColor: group.color }}
              title={`Group: ${group.name}`}
            />
          )}

          {tab.sleeping && (
            <span className="flex items-center" title="Tab is hibernating">
              <motion.span
                className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]"
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              />
            </span>
          )}

          {!tab.pinned && (
            <span
              className={`flex-1 text-sm truncate ${tab.active ? 'text-gray-100' : 'text-gray-400'}`}
            >
              {tab.title}
            </span>
          )}

          <motion.button
            type="button"
            onClick={e => {
              e.preventDefault();
              stopEventPropagation(e);
              togglePinTab(tab.id);
            }}
            onMouseDown={e => {
              stopEventPropagation(e);
            }}
            aria-label={tab.pinned ? `Unpin tab: ${tab.title}` : `Pin tab: ${tab.title}`}
            className={`${tab.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-0.5 rounded hover:bg-gray-700/50 transition-opacity text-gray-400 hover:text-blue-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 no-drag ml-1`}
            style={{ pointerEvents: 'auto', zIndex: 10011, isolation: 'isolate' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            title={tab.pinned ? 'Unpin tab' : 'Pin tab'}
          >
            {tab.pinned ? <Pin size={14} className="text-blue-400" /> : <PinOff size={14} />}
          </motion.button>

          {!tab.pinned && (
            <motion.button
              type="button"
              onClick={e => {
                e.preventDefault();
                stopEventPropagation(e);
                openPeek(tab);
              }}
              onMouseDown={e => {
                stopEventPropagation(e);
              }}
              aria-label={`Peek preview: ${tab.title}`}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-700/50 transition-opacity text-gray-400 hover:text-gray-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 no-drag ml-1"
              style={{ pointerEvents: 'auto', zIndex: 10011, isolation: 'isolate' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              title="Peek preview"
            >
              <Eye size={14} />
            </motion.button>
          )}

          {!tab.pinned && (
            <motion.button
              type="button"
              onClick={e => {
                e.preventDefault();
                stopEventPropagation(e);
                closeTab(tab.id);
              }}
              onAuxClick={e => {
                if (e.button === 1) {
                  e.preventDefault();
                  stopEventPropagation(e);
                  closeTab(tab.id);
                }
              }}
              onMouseDown={e => {
                stopEventPropagation(e);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(tab.id);
                }
              }}
              aria-label={`Close tab: ${tab.title}`}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-700/50 transition-opacity ml-1 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 no-drag"
              style={{ pointerEvents: 'auto', zIndex: 2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Close tab (Middle click)"
            >
              <X size={14} className="text-gray-400" />
            </motion.button>
          )}
        </motion.div>
      </TabHoverCard>
    );
  };

  const filteredTabs = useMemo(() => {
    // Defensive: Use safeTabs and filter invalid entries
    const validTabs = safeTabs.filter(tab => tab && tab.id);
    if (validTabs.length === 0) {
      return [];
    }
    return validTabs.filter(tab => !tab.appMode || tab.appMode === currentMode);
  }, [safeTabs, currentMode]);

  const tabElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const renderedGroupIds = new Set<string>();
    filteredTabs.forEach(tab => {
      const group = tab.groupId ? groupMap.get(tab.groupId) : null;
      if (group && !renderedGroupIds.has(group.id)) {
        renderedGroupIds.add(group.id);
        elements.push(renderGroupHeader(group));
      }
      if (group?.collapsed) {
        return;
      }
      elements.push(renderTabNode(tab));
    });
    return elements;
  }, [filteredTabs, groupMap, renderGroupHeader, renderTabNode]);
  const stripRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Tab[]>(tabs);
  const openPeek = usePeekPreviewStore(state => state.open);
  const predictiveRequestRef = useRef<Promise<void> | null>(null);
  const lastPredictionSignatureRef = useRef<string>('');
  const fetchPredictiveSuggestionsRef =
    useRef<(options?: { force?: boolean }) => Promise<void> | void>();
  const draggedTabIdRef = useRef<string | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  // Keep ref in sync with activeId (doesn't cause re-renders)
  useEffect(() => {
    currentActiveIdRef.current = activeId;
  }, [activeId]);

  const runPredictiveSuggestions = useCallback(
    async (options?: { force?: boolean }) => {
      if (!IS_ELECTRON) {
        // Predictive suggestions require IPC/Electron – clear any stale hints
        if (options?.force) {
          setPredictedClusters([]);
          setPrefetchEntries([]);
          setPredictionSummary(null);
        }
        return;
      }
      if (predictiveRequestRef.current && !options?.force) {
        return predictiveRequestRef.current;
      }

      const signature = tabsRef.current
        .map(tab => `${tab.id}:${tab.lastActiveAt ?? 0}`)
        .sort()
        .join('|');

      if (
        !options?.force &&
        signature &&
        signature === lastPredictionSignatureRef.current &&
        predictedClusters.length > 0
      ) {
        return;
      }

      const requestPromise = (async () => {
        try {
          const response = await ipc.tabs.predictiveGroups(options?.force ? { force: true } : {});
          lastPredictionSignatureRef.current = signature;
          if (!response) {
            setPredictedClusters([]);
            setPrefetchEntries([]);
            setPredictionSummary(null);
            return;
          }

          setPredictedClusters(Array.isArray(response.groups) ? response.groups : []);
          setPrefetchEntries(Array.isArray(response.prefetch) ? response.prefetch : []);
          setPredictionSummary(response.summary?.explanation ?? null);
        } catch (error) {
          if (IS_DEV) {
            console.warn('[TabStrip] Predictive suggestions failed', error);
          }
          if (options?.force) {
            setPredictedClusters([]);
            setPrefetchEntries([]);
            setPredictionSummary(null);
          }
        } finally {
          if (predictiveRequestRef.current === requestPromise) {
            predictiveRequestRef.current = null;
          }
        }
      })();

      predictiveRequestRef.current = requestPromise;
      return requestPromise;
    },
    [predictedClusters.length]
  );

  useEffect(() => {
    fetchPredictiveSuggestionsRef.current = runPredictiveSuggestions;
  }, [runPredictiveSuggestions]);

  useEffect(() => {
    if (!hasInitialized) return;
    fetchPredictiveSuggestionsRef.current?.({ force: true });
  }, [hasInitialized]);

  const refreshTabsFromMain = useCallback(async () => {
    if (!IS_ELECTRON) {
      return;
    }
    try {
      const tabList = await ipc.tabs.list();
      if (!Array.isArray(tabList)) {
        if (IS_DEV) {
          console.warn('[TabStrip] refreshTabsFromMain: Invalid tab list', tabList);
        }
        return;
      }

      if (IS_DEV) {
        console.log('[TabStrip] refreshTabsFromMain: Got', tabList.length, 'tabs');
      }

      const mappedTabs = tabList.map((t: any) => {
        // Get store metadata if available
        const storeTab = storeTabs.find(st => st.id === t.id);
        const appMode = storeTab?.appMode || currentMode;
        const pinned = storeTab?.pinned ?? Boolean(t.pinned);
        const groupId = storeTab?.groupId ?? t.groupId;

        return {
          id: t.id,
          title: t.title || 'New Tab',
          url: t.url || 'about:blank',
          active: t.active || false,
          mode: t.mode || 'normal',
          appMode: appMode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
          createdAt: t.createdAt,
          lastActiveAt: t.lastActiveAt,
          sessionId: t.sessionId,
          profileId: t.profileId,
          sleeping: Boolean(t.sleeping),
          pinned: pinned,
          groupId,
        };
      });

      const ids = mappedTabs
        .map(t => t.id)
        .sort()
        .join(',');
      previousTabIdsRef.current = ids;

      // Force update - always set state even if IDs are the same
      setTabs(mappedTabs);
      tabsRef.current = mappedTabs;
      setAllTabs(mapTabsForStore(mappedTabs));

      const activeTab = mappedTabs.find(t => t.active);
      if (activeTab) {
        setActiveTab(activeTab.id);
        currentActiveIdRef.current = activeTab.id;
      } else if (mappedTabs.length > 0) {
        // Tabs exist but none active - activate first one
        const firstTab = mappedTabs[0];
        if (firstTab) {
          setActiveTab(firstTab.id);
          currentActiveIdRef.current = firstTab.id;
          // Also activate in main process
          try {
            await ipc.tabs.activate({ id: firstTab.id });
          } catch {
            // Silent fail
          }
        }
      } else {
        setActiveTab(null);
        currentActiveIdRef.current = null;
      }

      fetchPredictiveSuggestionsRef.current?.();
    } catch (error) {
      if (IS_DEV) {
        console.error('[TabStrip] Failed to refresh tabs from main process:', error);
      }
    }
  }, [setActiveTab, setAllTabs]);

  useEffect(() => {
    const checkHologramSupport = () => {
      const supported = typeof navigator !== 'undefined' && 'xr' in navigator;
      setHologramSupported(supported);
      if (supported) {
        setHandoffStatus(prev => ({ ...prev, platform: 'xr-ready' }));
      }
    };
    checkHologramSupport();
  }, []);

  useEffect(() => {
    if (!handoffStatus.lastSentAt) return;
    void ipc.crossReality.sendHandoffStatus(handoffStatus);
  }, [handoffStatus]);

  // Wait for IPC to be ready before making calls
  useEffect(() => {
    if (!IS_ELECTRON) {
      let isMounted = true;

      const applyTabs = (list: Tab[]) => {
        if (!isMounted) return;
        const mapped = list.length
          ? list
          : [
              {
                id: 'local-initial',
                title: 'Welcome',
                url: 'about:blank',
                active: true,
                mode: 'normal',
              },
            ];
        setTabs(mapped);
        tabsRef.current = mapped;
        previousTabIdsRef.current = mapped
          .map(t => t.id)
          .sort()
          .join(',');
        setAllTabs(mapTabsForStore(mapped));
        const activeTab = mapped.find(t => t.active) ?? mapped[0];
        setActiveTab(activeTab ? activeTab.id : null);
        currentActiveIdRef.current = activeTab ? activeTab.id : null;
        setHasInitialized(true);
      };

      applyTabs(tabsRef.current.length > 0 ? tabsRef.current : tabs);

      const unsubscribe = ipcEvents.on('tabs:updated', (tabList: any[]) => {
        if (!isMounted) return;
        if (!Array.isArray(tabList) || tabList.length === 0) {
          applyTabs([]);
          return;
        }
        const mappedTabs: Tab[] = tabList.map(t => {
          // Get store metadata if available
          const storeTab = storeTabs.find(st => st.id === t.id);
          const appMode = storeTab?.appMode || currentMode;
          const pinned = storeTab?.pinned ?? Boolean((t as any).pinned);
          const groupId = storeTab?.groupId ?? (t as any).groupId;

          return {
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: Boolean(t.active),
            appMode: appMode,
            mode: (t as any).mode || 'normal',
            containerId: t.containerId,
            containerName: t.containerName,
            containerColor: t.containerColor,
            createdAt: t.createdAt,
            lastActiveAt: t.lastActiveAt,
            sessionId: t.sessionId,
            profileId: t.profileId,
            sleeping: (t as any).sleeping,
            pinned,
            groupId,
          };
        });
        applyTabs(mappedTabs);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }

    let isMounted = true;
    let ipcReady = false;

    const waitForIPC = () => {
      return new Promise<void>(resolve => {
        if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
          ipcReady = true;
          resolve();
          return;
        }

        const checkIPC = () => {
          if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
            ipcReady = true;
            resolve();
          }
        };

        // Listen for IPC ready signal
        window.addEventListener('ipc:ready', checkIPC, { once: true });

        // Also check periodically (fallback)
        const interval = setInterval(() => {
          if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
            clearInterval(interval);
            ipcReady = true;
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(interval);
          if (!ipcReady) {
            console.warn('IPC not ready after 5 seconds, proceeding anyway');
            resolve();
          }
        }, 5000);
      });
    };

    const loadTabs = async (isInitialLoad = false) => {
      if (!isMounted) return;

      // CRITICAL: Don't load tabs if we're creating one (prevents loops)
      if (isCreatingTabRef.current && !isInitialLoad) {
        return;
      }

      // Wait for IPC to be ready
      if (!ipcReady) {
        await waitForIPC();
      }

      if (!isMounted) return;

      try {
        const tabList = await ipc.tabs.list();
        if (!isMounted) return;

        if (Array.isArray(tabList) && tabList.length > 0) {
          const mappedTabs = tabList.map((t: any) => {
            // Get appMode from store if available, otherwise use current mode
            const storeTab = storeTabs.find(st => st.id === t.id);
            const appMode = storeTab?.appMode || currentMode;

            return {
              id: t.id,
              title: t.title || 'New Tab',
              url: t.url || 'about:blank',
              active: t.active || false,
              mode: t.mode || 'normal',
              appMode: appMode,
              containerId: t.containerId,
              containerName: t.containerName,
              containerColor: t.containerColor,
              createdAt: t.createdAt,
              lastActiveAt: t.lastActiveAt,
              sessionId: t.sessionId,
              profileId: t.profileId,
            };
          });

          // Update ref to track tab IDs and only update state if changed
          const tabIds = mappedTabs
            .map(t => t.id)
            .sort()
            .join(',');
          if (previousTabIdsRef.current !== tabIds) {
            previousTabIdsRef.current = tabIds;
            setTabs(mappedTabs);
            setAllTabs(mapTabsForStore(mappedTabs));
          }

          // Set active tab in store (only if changed - use ref to avoid dependency)
          const activeTab = mappedTabs.find(t => t.active);
          const currentActive = currentActiveIdRef.current;
          if (activeTab && activeTab.id !== currentActive) {
            setActiveTab(activeTab.id);
          } else if (
            mappedTabs.length > 0 &&
            !activeTab &&
            mappedTabs[0] &&
            mappedTabs[0].id !== currentActive
          ) {
            // No active tab, activate first one
            await ipc.tabs.activate({ id: mappedTabs[0].id });
            setActiveTab(mappedTabs[0].id);
          }

          if (isInitialLoad) {
            setHasInitialized(true);
          }
        } else {
          // Only create initial tab on first mount, not every time tabs are empty
          // AND only if we're not restoring from session
          // AND only if we're not already creating a tab
          // AND only if we haven't already initialized (prevent HMR duplicates)
          if (
            isInitialLoad &&
            !hasInitialized &&
            !isRestoringRef.current &&
            !isCreatingTabRef.current
          ) {
            // Always wait a bit to allow session restoration to complete
            // This prevents creating duplicate tabs during HMR or session restore
            setTimeout(async () => {
              // Double-check conditions after delay
              if (
                !isMounted ||
                hasInitialized ||
                isRestoringRef.current ||
                isCreatingTabRef.current
              ) {
                return;
              }

              // Check again if tabs exist after waiting (they might have been restored)
              try {
                const recheckTabs = await ipc.tabs.list();
                if (Array.isArray(recheckTabs) && recheckTabs.length > 0) {
                  // Tabs exist (restored from session or created elsewhere), don't create new one
                  setHasInitialized(true);
                  return;
                }
              } catch {
                // Ignore errors, proceed to create tab
              }

              // Still no tabs after waiting, create one
              isCreatingTabRef.current = true;
              setHasInitialized(true);

              try {
                // Ensure IPC is ready
                if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
                  await new Promise(resolve => setTimeout(resolve, 200));
                }

                const result = await ipc.tabs.create('about:blank');
                if (result && result.id) {
                  if (IS_DEV) {
                    console.log('[TabStrip] Initial tab created after wait:', result.id);
                  }
                }
              } catch (error) {
                if (IS_DEV) {
                  console.error('[TabStrip] Failed to create initial tab:', error);
                }
              } finally {
                setTimeout(() => {
                  isCreatingTabRef.current = false;
                }, 1000);
              }
            }, 300); // Wait 300ms to allow session restoration
          } else {
            // No tabs and we've already initialized - just clear state
            if (isMounted) {
              setTabs([]);
              setAllTabs([]);
              setActiveTab(null);
              if (!hasInitialized) {
                setHasInitialized(true);
              }
            }
          }
        }
      } catch {
        // Silently handle errors - don't auto-create tab on error
        if (isInitialLoad && isMounted && !hasInitialized) {
          setHasInitialized(true);
        }
      }
    };

    // Listen for session restoration state (only once)
    const handleRestoring = (restoring: boolean) => {
      if (isMounted) {
        isRestoringRef.current = restoring;
      }
    };

    const unsubscribeRestoring = ipcEvents.on<boolean>('session:restoring', handleRestoring);

    // Listen for restore tab messages (only once)
    const handleRestoreTab = async (tabState: any) => {
      if (!isMounted || isCreatingTabRef.current) return;

      isCreatingTabRef.current = true;
      try {
        await ipc.tabs.create({
          url: tabState.url || 'about:blank',
          containerId: tabState.containerId,
          mode: tabState.mode,
          profileId: tabState.profileId,
          tabId: tabState.id,
          activate: Boolean(tabState.activate),
          createdAt: tabState.createdAt,
          lastActiveAt: tabState.lastActiveAt,
          sessionId: tabState.sessionId,
          fromSessionRestore: true,
        });
      } catch (error) {
        if (IS_DEV) {
          console.error('Failed to restore tab from session:', error);
        }
      } finally {
        // Reset flag after a delay
        setTimeout(() => {
          isCreatingTabRef.current = false;
        }, 500);
      }
    };

    const unsubscribeRestoreTab = ipcEvents.on<any>('session:restore-tab', handleRestoreTab);

    // Initial load only - don't auto-create tabs on subsequent updates
    // Add a small delay to ensure session restoration has a chance to complete first
    const initTimer = setTimeout(() => {
      loadTabs(true);
    }, 100);

    // Listen for tab updates via IPC events (more reliable)
    // IPC events are the source of truth - always sync with them
    // OPTIMIZED: Only update if data actually changed to reduce re-renders
    const handleTabUpdate = (tabList: any[]) => {
      // Don't process updates if component is unmounted or invalid data
      if (!isMounted) {
        return;
      }

      if (!Array.isArray(tabList)) {
        if (IS_DEV) {
          console.warn('[TabStrip] handleTabUpdate: Invalid data', { tabList });
        }
        return;
      }

      const mappedTabs = tabList.map((t: any) => {
        // Get appMode from store if available, otherwise use current mode
        const storeTab = storeTabs.find(st => st.id === t.id);
        const appMode = storeTab?.appMode || currentMode;

        return {
          id: t.id,
          title: t.title || 'New Tab',
          url: t.url || 'about:blank',
          active: t.active || false,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
          mode: t.mode,
          appMode: appMode,
          createdAt: t.createdAt,
          lastActiveAt: t.lastActiveAt,
          sessionId: t.sessionId,
          profileId: t.profileId,
          sleeping: Boolean(t.sleeping),
        };
      });

      // OPTIMIZED: Check if tabs actually changed before updating
      const newTabIds = mappedTabs
        .map(t => t.id)
        .sort()
        .join(',');
      const currentTabIds = previousTabIdsRef.current;
      const activeTabFromIPC = mappedTabs.find(t => t.active);
      const activeTabIdFromIPC = activeTabFromIPC?.id || null;

      // Skip update if nothing changed (prevents unnecessary re-renders)
      if (newTabIds === currentTabIds && activeTabIdFromIPC === currentActiveIdRef.current) {
        // Still update refs in case of subtle changes
        tabsRef.current = mappedTabs;
        return;
      }

      // Update peek preview if visible
      const peekState = usePeekPreviewStore.getState();
      if (peekState.visible && peekState.tab) {
        const updatedPeek = mappedTabs.find(t => t.id === peekState.tab?.id);
        if (updatedPeek) {
          usePeekPreviewStore.getState().sync(updatedPeek);
        }
      }

      // Update tabs array (only if changed)
      setTabs(mappedTabs);
      tabsRef.current = mappedTabs;
      setAllTabs(mapTabsForStore(mappedTabs));
      previousTabIdsRef.current = newTabIds;

      // Update active tab only if changed
      if (activeTabIdFromIPC && activeTabIdFromIPC !== currentActiveIdRef.current) {
        setActiveTab(activeTabIdFromIPC);
        currentActiveIdRef.current = activeTabIdFromIPC;
      } else if (mappedTabs.length > 0 && !activeTabIdFromIPC) {
        // No active tab in IPC, but tabs exist - activate first one
        const firstTabId = mappedTabs[0].id;
        if (firstTabId !== currentActiveIdRef.current) {
          setActiveTab(firstTabId);
          currentActiveIdRef.current = firstTabId;
          // Also tell main process to activate it
          if (IS_ELECTRON) {
            ipc.tabs.activate({ id: firstTabId }).catch(() => {});
          }
        }
      } else if (mappedTabs.length === 0 && currentActiveIdRef.current !== null) {
        // No tabs at all
        setActiveTab(null);
        currentActiveIdRef.current = null;
      }
    };

    // Subscribe to IPC events via the event bus (only once)
    const unsubscribe = ipcEvents.on('tabs:updated', handleTabUpdate);

    // Fallback polling if events don't work - reduced frequency to improve performance
    // Only poll to sync state, don't auto-create tabs
    // Note: We can poll even when creating tabs - loadTabs won't create duplicate tabs
    const pollInterval = setInterval(() => {
      if (isMounted && ipcReady && hasInitialized) {
        // Only skip if actively creating to avoid race conditions during creation
        if (!isCreatingTabRef.current && !activationInFlightRef.current) {
          loadTabs(false).catch(() => {}); // Silent error handling
        }
      }
    }, 5000); // Poll every 5 seconds (reduced from 2s to improve performance)

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeRestoring();
      unsubscribeRestoreTab();
      clearInterval(pollInterval);
      clearTimeout(initTimer);
    };
  }, []); // Empty deps - only run on mount, IPC events handle all updates

  const addTab = async () => {
    if (!IS_ELECTRON) {
      const baseTabs = (tabsRef.current.length > 0 ? tabsRef.current : tabs).map(t => ({
        ...t,
        active: false,
      }));
      const newTab: Tab = {
        id: `local-${Date.now()}`,
        title: 'New Tab',
        url: 'about:blank',
        active: true,
        mode: 'normal',
      };
      const updated = [...baseTabs, newTab];
      setTabs(updated);
      tabsRef.current = updated;
      previousTabIdsRef.current = updated
        .map(t => t.id)
        .sort()
        .join(',');
      setAllTabs(mapTabsForStore(updated));
      setActiveTab(newTab.id);
      currentActiveIdRef.current = newTab.id;
      ipcEvents.emit('tabs:updated', mapTabsForStore(updated));
      return;
    }

    // Prevent multiple simultaneous tab creations (debounce)
    if (isCreatingTabRef.current) {
      if (IS_DEV) {
        console.log('[TabStrip] Tab creation already in progress, skipping');
      }
      return;
    }

    isCreatingTabRef.current = true;
    try {
      // Ensure IPC is ready - retry a few times
      let ipcReady = false;
      for (let i = 0; i < 3; i++) {
        if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
          ipcReady = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!ipcReady) {
        if (IS_DEV) {
          console.warn(
            '[TabStrip] IPC not ready after retries, but attempting tab creation anyway'
          );
        }
        // Don't abort - try to create anyway, might work
      }

      const result = await ipc.tabs.create({
        url: 'about:blank',
        containerId: activeContainerId || undefined,
      });
      if (result && result.id) {
        // Tag the new tab with current app mode
        const tabId = typeof result === 'object' && 'id' in result ? result.id : result;
        updateTab(tabId, { appMode: currentMode });

        // Tab created successfully - IPC event will update the UI
        if (IS_DEV) {
          console.log('[TabStrip] Tab created via addTab:', tabId);
        }
        // Force a refresh to ensure UI updates even if IPC event is delayed
        setTimeout(async () => {
          try {
            await refreshTabsFromMain();
          } catch {
            // Silent fail - IPC event should handle it
          }
        }, 100);
      } else {
        if (IS_DEV) {
          console.warn('[TabStrip] Tab creation returned no ID:', result);
        }
      }
    } catch (error) {
      if (IS_DEV) {
        console.error('Failed to create tab:', error);
      }
    } finally {
      // Reset flag quickly - IPC events will handle the update
      // Don't wait too long or we'll block legitimate updates
      setTimeout(() => {
        isCreatingTabRef.current = false;
      }, 200); // Increased slightly to prevent rapid-fire clicks
    }
  };

  const handleReopenClosedTab = useCallback(async (entry?: ClosedTab) => {
    await reopenClosedTab(entry);
  }, []);

  const closeTab = async (tabId: string) => {
    if (!IS_ELECTRON) {
      const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
      const idx = currentTabs.findIndex(t => t.id === tabId);
      if (idx === -1) {
        return;
      }
      const tabBeingClosed = currentTabs[idx];
      if (tabBeingClosed) {
        rememberClosedTab(tabBeingClosed);
        // Save for resurrection (auto-reopen after 5 minutes)
        saveTabForResurrection(tabBeingClosed);
        // Schedule auto-resurrection after 5 minutes
        scheduleAutoResurrection(RESURRECTION_DELAY_MS);
      }
      const wasActive = currentTabs[idx]?.active;
      const remaining = currentTabs.filter(t => t.id !== tabId);
      let updated = remaining;

      if (remaining.length === 0) {
        const fallbackTab: Tab = {
          id: `local-${Date.now()}`,
          title: 'New Tab',
          url: 'about:blank',
          active: true,
          mode: 'normal',
        };
        updated = [fallbackTab];
      } else if (wasActive) {
        // After removing tab at idx, prefer the tab at the same position
        // If that doesn't exist (we closed the last tab), use the previous one
        let nextIndex = idx;
        if (nextIndex >= remaining.length) {
          nextIndex = remaining.length - 1;
        }
        updated = remaining.map((t, index) => ({
          ...t,
          active: index === nextIndex,
        }));
      }

      const activeTab = updated.find(t => t.active) ?? updated[0];

      setTabs(updated);
      tabsRef.current = updated;
      previousTabIdsRef.current = updated
        .map(t => t.id)
        .sort()
        .join(',');
      setAllTabs(mapTabsForStore(updated));
      setActiveTab(activeTab ? activeTab.id : null);
      currentActiveIdRef.current = activeTab ? activeTab.id : null;
      ipcEvents.emit('tabs:updated', mapTabsForStore(updated));
      return;
    }

    // Prevent closing if already creating a tab
    if (isCreatingTabRef.current) {
      return;
    }

    // Get current tabs
    const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
    const tabToClose = currentTabs.find(t => t.id === tabId);
    if (!tabToClose) {
      return;
    }
    rememberClosedTab(tabToClose);
    // Save for resurrection (auto-reopen after 5 minutes)
    saveTabForResurrection(tabToClose);
    // Schedule auto-resurrection after 5 minutes
    scheduleAutoResurrection(RESURRECTION_DELAY_MS);

    const wasActive = tabToClose.active;
    const tabIndex = currentTabs.findIndex(t => t.id === tabId);
    const remainingTabs = currentTabs.filter(t => t.id !== tabId);
    const closingLastTab = remainingTabs.length === 0;
    const snapshotTabs = currentTabs.map(t => ({ ...t }));
    const previousActiveId = currentActiveIdRef.current;

    // Update UI immediately (optimistic update)
    setTabs(remainingTabs);
    tabsRef.current = remainingTabs;
    previousTabIdsRef.current = remainingTabs
      .map(t => t.id)
      .sort()
      .join(',');
    setAllTabs(mapTabsForStore(remainingTabs));

    // If closing active tab, activate the next one
    if (wasActive && remainingTabs.length > 0) {
      // After removing tab at tabIndex, prefer the tab at the same position
      // If that doesn't exist (we closed the last tab), use the previous one
      let nextTabIndex = tabIndex;
      if (nextTabIndex >= remainingTabs.length) {
        nextTabIndex = remainingTabs.length - 1;
      }
      const nextTab = remainingTabs[nextTabIndex];
      if (nextTab) {
        setActiveTab(nextTab.id);
        currentActiveIdRef.current = nextTab.id;
      }
    } else if (remainingTabs.length === 0) {
      setActiveTab(null);
      currentActiveIdRef.current = null;
    }

    if (IS_DEV) {
      console.log(
        '[TabStrip] Closing tab (optimistic):',
        tabId,
        'previous active:',
        previousActiveId
      );
    }

    try {
      const result = await Promise.race([
        ipc.tabs.close({ id: tabId }),
        new Promise<{ success: boolean; error?: string }>(resolve =>
          setTimeout(() => resolve({ success: false, error: 'Timeout' }), 2000)
        ),
      ]);

      if (IS_DEV) {
        console.log('[TabStrip] tabs.close result:', result);
      }

      if (!result || !result.success) {
        if (IS_DEV) {
          console.warn(
            '[TabStrip] Tab close failed or timed out, reverting:',
            tabId,
            result?.error
          );
        }

        setTabs(snapshotTabs);
        tabsRef.current = snapshotTabs;
        previousTabIdsRef.current = snapshotTabs
          .map(t => t.id)
          .sort()
          .join(',');
        setAllTabs(mapTabsForStore(snapshotTabs));

        if (previousActiveId) {
          setActiveTab(previousActiveId);
          currentActiveIdRef.current = previousActiveId;
        }

        await refreshTabsFromMain();
      } else if (closingLastTab) {
        // Ensure there is always at least one tab per mode
        setTimeout(() => {
          void addTab();
        }, 50);
      }
    } catch (error) {
      if (IS_DEV) {
        console.error('[TabStrip] Exception during tab close, reverting:', error);
      }

      setTabs(snapshotTabs);
      tabsRef.current = snapshotTabs;
      previousTabIdsRef.current = snapshotTabs
        .map(t => t.id)
        .sort()
        .join(',');
      setAllTabs(mapTabsForStore(snapshotTabs));

      if (previousActiveId) {
        setActiveTab(previousActiveId);
        currentActiveIdRef.current = previousActiveId;
      }

      await refreshTabsFromMain();
    }
  };

  const activateTab = useCallback(
    async (tabId: string) => {
      if (!IS_ELECTRON) {
        const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
        const tabToActivate = currentTabs.find(t => t.id === tabId);
        if (!tabToActivate) {
          return;
        }
        const updated = currentTabs.map(t => ({
          ...t,
          active: t.id === tabId,
        }));
        setTabs(updated);
        tabsRef.current = updated;
        previousTabIdsRef.current = updated
          .map(t => t.id)
          .sort()
          .join(',');
        setAllTabs(mapTabsForStore(updated));
        setActiveTab(tabId);
        currentActiveIdRef.current = tabId;
        ipcEvents.emit('tabs:updated', mapTabsForStore(updated));
        return;
      }

      // Fast path: Skip if already active (check both ref and store for accuracy)
      if (activationInFlightRef.current === tabId) {
        return;
      }
      if (currentActiveIdRef.current === tabId && activeId === tabId) {
        return;
      }

      // Get current tabs from ref (most up-to-date, avoids re-render)
      const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
      const tabToActivate = currentTabs.find(t => t.id === tabId);
      if (!tabToActivate) {
        if (IS_DEV) {
          console.warn('[TabStrip] Tab not found for activation:', tabId);
        }
        return;
      }

      // Set flag immediately to prevent duplicate activations
      activationInFlightRef.current = tabId;

      // OPTIMIZED: Only update active state, not entire tabs array
      // IPC event will update tabs array, so we just need to update activeId
      setActiveTab(tabId);
      currentActiveIdRef.current = tabId;

      // Fire IPC call without waiting (non-blocking for better UX)
      // IPC event handler will update tabs array when it receives confirmation
      ipc.tabs
        .activate({ id: tabId })
        .then(result => {
          if (!result || !result.success) {
            // Only revert if activation failed
            if (IS_DEV) {
              console.warn('[TabStrip] Tab activation failed:', tabId, result?.error);
            }
            // Refresh from main process to get correct state
            refreshTabsFromMain().catch(() => {});
          }
          activationInFlightRef.current = null;
        })
        .catch(error => {
          if (IS_DEV) {
            console.error('[TabStrip] Tab activation error:', error);
          }
          // Refresh from main process to get correct state
          refreshTabsFromMain().catch(() => {});
          activationInFlightRef.current = null;
        });
    },
    [activeId, setActiveTab, setAllTabs, refreshTabsFromMain]
  );

  const handleApplyCluster = useCallback(
    (clusterId: string) => {
      const cluster = predictedClusters.find(c => c.id === clusterId);
      if (!cluster) return;
      if (!cluster.tabIds.length) return;

      const currentTabs = tabsRef.current;
      const matching = currentTabs.filter(tab => cluster.tabIds.includes(tab.id));
      if (matching.length <= 1) return;

      let etld = 'workspace';
      try {
        if (matching[0]?.url) {
          etld = new URL(matching[0].url).hostname.replace(/^www\./, '') || 'workspace';
        }
      } catch {
        etld = 'workspace';
      }

      const label = matching.length >= 3 ? `${etld} cluster` : cluster.label;

      void ipc.tabs
        .create({
          url: 'about:blank',
          containerId: etld,
          activate: true,
        })
        .then(async (result: any) => {
          if (!result?.id) return;
          for (const tab of matching) {
            try {
              await ipc.tabs.moveToWorkspace({ tabId: tab.id, workspaceId: result.id, label });
            } catch (error) {
              if (IS_DEV) {
                console.warn('[TabStrip] Failed to regroup tab', error);
              }
            }
          }
          setTimeout(() => {
            void useTabGraphStore.getState().refresh();
          }, 300);
          fetchPredictiveSuggestionsRef.current?.({ force: true });
        });
    },
    [predictedClusters]
  );

  const handlePrefetchOpen = useCallback(
    (entry: { tabId: string; url: string; reason: string; confidence?: number }) => {
      if (!entry?.url) return;
      void ipc.tabs.create({ url: entry.url, activate: true }).then(() => {
        fetchPredictiveSuggestionsRef.current?.({ force: true });
      });
    },
    []
  );

  // Ensure active tab stays visible (only when activeId changes)
  useEffect(() => {
    if (!activeId || !stripRef.current) return;
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      try {
        const el = stripRef.current?.querySelector(
          `[data-tab="${CSS.escape(activeId)}"]`
        ) as HTMLElement;
        if (el) {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      } catch {}
    });
  }, [activeId]); // Only depend on activeId, not tabs array

  // Keyboard navigation (Left/Right/Home/End)
  // Use refs to access current tabs/activeId without causing re-renders
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    tabsRef.current = tabs;
    activeIdRef.current = activeId;
  }, [tabs, activeId]);

  useEffect(() => {
    if (!stripRef.current || !activeId) {
      return;
    }
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const target = stripRef.current?.querySelector<HTMLElement>(
        `[data-tab="${CSS.escape(activeId)}"]`
      );
      if (target) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      }
    });
  }, [activeId, tabs.length]);

  useEffect(() => {
    if (!stripRef.current || !activeId) return;
    const target = stripRef.current.querySelector<HTMLElement>(
      `[data-tab="${CSS.escape(activeId)}"]`
    );
    if (target && document.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  }, [activeId, tabs.length]);

  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }

      // Use refs to get current state without causing re-renders
      const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
      const currentActive = activeIdRef.current || activeId;
      const currentIndex = currentTabs.findIndex(t => t.id === currentActive);

      if (currentIndex === -1 || currentTabs.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let nextIndex = currentIndex;
      switch (event.key) {
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = currentTabs.length - 1;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + currentTabs.length) % currentTabs.length;
          break;
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % currentTabs.length;
          break;
      }

      const nextTab = currentTabs[nextIndex];
      if (nextTab) {
        void activateTab(nextTab.id);
      }
    },
    [tabs, activeId, activateTab]
  );

  useEffect(() => {
    const handleModifiedShortcuts = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (!modifier || event.key !== 'Tab') {
        return;
      }

      const currentTabs = tabsRef.current;
      const currentActiveId = activeIdRef.current;
      if (!currentTabs.length || !currentActiveId) {
        return;
      }

      event.preventDefault();
      const currentIndex = currentTabs.findIndex(tab => tab.id === currentActiveId);
      if (currentIndex === -1) {
        return;
      }

      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
        : (currentIndex + 1) % currentTabs.length;

      const nextTab = currentTabs[nextIndex];
      if (nextTab) {
        void activateTab(nextTab.id);
      }
    };

    window.addEventListener('keydown', handleModifiedShortcuts);
    return () => window.removeEventListener('keydown', handleModifiedShortcuts);
  }, [activateTab]);

  return (
    <>
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Browser tabs"
        className="no-drag flex items-center gap-1 px-3 py-2 bg-[#1A1D28] border-b border-gray-700/30 overflow-x-auto scrollbar-hide relative"
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 9999 }}
        onKeyDown={handleKeyNavigation}
        data-onboarding="tabstrip"
        onDragOver={e => {
          // Allow drop for tab reordering (not graph drag)
          if (draggedTabIdRef.current && !e.dataTransfer.types.includes(TAB_GRAPH_DRAG_MIME)) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';

            // Calculate drop index based on mouse position
            const rect = stripRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const tabElements = stripRef.current?.querySelectorAll('[data-tab]');
            if (!tabElements || tabElements.length === 0) return;

            let dropIndex = tabs.length;
            for (let i = 0; i < tabElements.length; i++) {
              const tabEl = tabElements[i] as HTMLElement;
              const tabRect = tabEl.getBoundingClientRect();
              const relativeX = tabRect.left - rect.left + tabRect.width / 2;

              if (mouseX < relativeX) {
                dropIndex = i;
                break;
              }
            }

            dragOverIndexRef.current = dropIndex;
          }
        }}
        onDrop={async e => {
          // Handle tab reordering (not graph drag)
          if (draggedTabIdRef.current && !e.dataTransfer.types.includes(TAB_GRAPH_DRAG_MIME)) {
            e.preventDefault();
            e.stopPropagation();

            const tabId = draggedTabIdRef.current;
            const newIndex = dragOverIndexRef.current ?? tabs.length - 1;

            // Find current index
            const currentIndex = tabs.findIndex(t => t.id === tabId);
            if (currentIndex === -1 || currentIndex === newIndex) {
              draggedTabIdRef.current = null;
              dragOverIndexRef.current = null;
              return;
            }

            // Optimistically update UI
            const newTabs = [...tabs];
            const [movedTab] = newTabs.splice(currentIndex, 1);
            newTabs.splice(newIndex, 0, movedTab);
            setTabs(newTabs);
            tabsRef.current = newTabs;
            setAllTabs(mapTabsForStore(newTabs));

            // Call IPC to reorder
            try {
              const result = await ipc.tabs.reorder(tabId, newIndex);
              if (!result.success) {
                // Revert on failure
                setTabs(tabs);
                tabsRef.current = tabs;
                setAllTabs(mapTabsForStore(tabs));
                if (IS_DEV) {
                  console.warn('[TabStrip] Reorder failed:', result.error);
                }
              }
            } catch (error) {
              // Revert on error
              setTabs(tabs);
              tabsRef.current = tabs;
              setAllTabs(mapTabsForStore(tabs));
              if (IS_DEV) {
                console.error('[TabStrip] Reorder error:', error);
              }
            }

            draggedTabIdRef.current = null;
            dragOverIndexRef.current = null;
          }
        }}
        onDragLeave={e => {
          // Clear drag state when leaving tabstrip
          if (!stripRef.current?.contains(e.relatedTarget as Node)) {
            dragOverIndexRef.current = null;
          }
        }}
      >
        <PredictivePrefetchHint entry={prefetchEntries[0] ?? null} onOpen={handlePrefetchOpen} />
        <PredictiveClusterChip
          clusters={predictedClusters}
          onApply={handleApplyCluster}
          summary={predictionSummary}
        />
        <div className="flex items-center gap-2 min-w-0 flex-1" style={{ pointerEvents: 'auto' }}>
          <AnimatePresence mode="popLayout">
            {tabElements.length > 0 ? tabElements : null}
          </AnimatePresence>

          {/* Container Selector & New Tab Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              type="button"
              onClick={e => {
                stopEventPropagation(e);
                const namePrompt =
                  window.prompt('New group name', `Group ${tabGroups.length + 1}`) ?? undefined;
                const group = handleCreateGroupShortcut(
                  namePrompt?.trim() ? namePrompt : undefined
                );
                if (draggedTabIdRef.current && group) {
                  assignTabToGroup(draggedTabIdRef.current, group.id);
                  draggedTabIdRef.current = null;
                }
              }}
              onMouseDown={e => {
                stopEventPropagation(e);
              }}
              onDragOver={e => {
                if (!draggedTabIdRef.current) return;
                e.preventDefault();
                e.stopPropagation();
                setGroupDragTarget(NEW_GROUP_DROP_ID);
              }}
              onDragLeave={() => {
                if (groupDragTarget === NEW_GROUP_DROP_ID) {
                  setGroupDragTarget(null);
                }
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                handleDropToNewGroup();
              }}
              className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                groupDragTarget === NEW_GROUP_DROP_ID
                  ? 'border-blue-500/70 text-blue-200 bg-blue-500/10'
                  : 'border-gray-700/40 text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <FolderPlus size={14} />
              Group
            </motion.button>
            <div className="hidden lg:block">
              <ContainerQuickSelector compact showLabel={false} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={recentlyClosed.length === 0}
                  className={`
                    p-2 rounded-lg border transition
                    ${recentlyClosed.length === 0 ? 'border-transparent text-gray-600 cursor-not-allowed' : 'border-gray-700/40 hover:bg-gray-800/50 text-gray-300 hover:text-gray-100'}
                  `}
                  title={
                    recentlyClosed.length === 0
                      ? 'No recently closed tabs'
                      : 'Reopen closed tab (Ctrl+Shift+T / ⌘⇧T)'
                  }
                >
                  <RotateCcw size={16} />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Recently closed</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentlyClosed.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">No tabs to reopen</div>
                ) : (
                  recentlyClosed.map(entry => {
                    let hostname = 'about:blank';
                    if (entry.url) {
                      try {
                        hostname = new URL(entry.url).hostname;
                      } catch {
                        hostname = entry.url;
                      }
                    }
                    return (
                      <DropdownMenuItem
                        key={entry.closedId}
                        className="flex flex-col items-start gap-1 py-2"
                        onClick={() => handleReopenClosedTab(entry)}
                      >
                        <span className="text-sm text-slate-100">
                          {entry.title || entry.url || 'Untitled tab'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {hostname} • {new Date(entry.closedAt).toLocaleTimeString()}
                        </span>
                      </DropdownMenuItem>
                    );
                  })
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={recentlyClosed.length === 0}
                  onClick={() => handleReopenClosedTab()}
                  className="gap-2"
                >
                  <RotateCcw size={14} />
                  Reopen last tab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <motion.button
              onClick={e => {
                stopEventPropagation(e);
                addTab();
              }}
              onMouseDown={e => {
                stopEventPropagation(e);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  stopEventPropagation(e);
                  addTab();
                }
              }}
              aria-label="New tab"
              className="p-2 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-gray-700/30 text-gray-400 hover:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ zIndex: 10011, isolation: 'isolate' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="New Tab (Ctrl+T / ⌘T)"
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <Portal>
            <TabContextMenu
              tabId={contextMenu.tabId}
              url={contextMenu.url}
              containerId={
                contextMenu.containerId ?? tabs.find(t => t.id === contextMenu.tabId)?.containerId
              }
              containerName={
                contextMenu.containerName ??
                tabs.find(t => t.id === contextMenu.tabId)?.containerName
              }
              containerColor={
                contextMenu.containerColor ??
                tabs.find(t => t.id === contextMenu.tabId)?.containerColor
              }
              mode={contextMenu.mode ?? tabs.find(t => t.id === contextMenu.tabId)?.mode}
              sleeping={
                contextMenu.sleeping ?? tabs.find(t => t.id === contextMenu.tabId)?.sleeping
              }
              onClose={() => setContextMenu(null)}
            />
          </Portal>
        )}
      </div>

      <HolographicPreviewOverlay
        visible={Boolean(holographicPreviewTabId)}
        tabId={holographicPreviewTabId}
        url={previewMetadata?.url}
        title={previewMetadata?.title}
        onClose={() => {
          setHolographicPreviewTabId(null);
          setPreviewMetadata(null);
        }}
      />
    </>
  );
}
