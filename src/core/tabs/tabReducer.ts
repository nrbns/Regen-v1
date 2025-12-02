/**
 * Tab State Reducer - Stable tab management with UUID keys
 * Prevents null tab states and race conditions
 */

import type { Tab, TabGroup, ClosedTab } from '../../state/tabsStore';

export type TabAction =
  | { type: 'ADD_TAB'; payload: Omit<Tab, 'id'> & { id?: string } }
  | { type: 'SET_ACTIVE'; payload: { id: string | null } }
  | { type: 'SET_ALL'; payload: { tabs: Tab[] } }
  | { type: 'REMOVE_TAB'; payload: { id: string } }
  | { type: 'UPDATE_TAB'; payload: { id: string; updates: Partial<Tab> } }
  | { type: 'NAVIGATE_TAB'; payload: { id: string; url: string } }
  | { type: 'GO_BACK'; payload: { id: string } }
  | { type: 'GO_FORWARD'; payload: { id: string } }
  | { type: 'PIN_TAB'; payload: { id: string } }
  | { type: 'UNPIN_TAB'; payload: { id: string } }
  | { type: 'REMEMBER_CLOSED'; payload: { tab: Tab } }
  | { type: 'POP_RECENTLY_CLOSED' }
  | { type: 'CLEAR_RECENTLY_CLOSED' }
  | { type: 'CREATE_GROUP'; payload: { group: TabGroup } }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<TabGroup> } }
  | { type: 'DELETE_GROUP'; payload: { id: string } }
  | { type: 'ASSIGN_TAB_TO_GROUP'; payload: { tabId: string; groupId: string | null } };

export interface TabState {
  tabs: Map<string, Tab>; // Use Map for O(1) lookups
  activeId: string | null;
  recentlyClosed: ClosedTab[];
  tabGroups: Map<string, TabGroup>; // Use Map for O(1) lookups
}

const MAX_RECENTLY_CLOSED = 12;
const MAX_TABS = 15;

/**
 * Generate UUID for tab/group IDs
 */
export function generateTabId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Tab reducer - pure function for state updates
 */
export function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'ADD_TAB': {
      // Check tab limit
      if (state.tabs.size >= MAX_TABS) {
        return state; // Don't add if limit reached
      }

      const id = action.payload.id || generateTabId();
      const tab: Tab = {
        ...action.payload,
        id,
        createdAt: action.payload.createdAt ?? Date.now(),
        lastActiveAt: Date.now(),
        active: false,
      };

      const newTabs = new Map(state.tabs);
      newTabs.set(id, tab);

      return {
        ...state,
        tabs: newTabs,
        activeId: id, // Auto-activate new tab
      };
    }

    case 'SET_ACTIVE': {
      const { id } = action.payload;

      // Validate tab exists if id is provided
      if (id !== null && !state.tabs.has(id)) {
        console.warn('[TabReducer] setActive: Tab not found', id);
        return state; // Don't change state if tab doesn't exist
      }

      // Update all tabs' active state
      const newTabs = new Map(state.tabs);
      for (const [tabId, tab] of newTabs.entries()) {
        newTabs.set(tabId, {
          ...tab,
          active: tabId === id,
          lastActiveAt: tabId === id ? Date.now() : tab.lastActiveAt,
        });
      }

      return {
        ...state,
        tabs: newTabs,
        activeId: id,
      };
    }

    case 'SET_ALL': {
      const { tabs } = action.payload;
      const newTabsMap = new Map<string, Tab>();
      const newGroupsMap = new Map(state.tabGroups);

      // Normalize and validate tabs
      for (const tab of tabs) {
        if (!tab.id || typeof tab.id !== 'string') {
          console.warn('[TabReducer] Invalid tab (missing id):', tab);
          continue;
        }
        newTabsMap.set(tab.id, {
          ...tab,
          createdAt: tab.createdAt ?? Date.now(),
          lastActiveAt: tab.lastActiveAt ?? Date.now(),
        });
      }

      // Find active tab
      const activeCandidate = tabs.find(t => t.active && t.id) ?? tabs.find(t => t.id) ?? null;

      return {
        ...state,
        tabs: newTabsMap,
        activeId: activeCandidate?.id ?? null,
        tabGroups: newGroupsMap,
      };
    }

    case 'REMOVE_TAB': {
      const { id } = action.payload;
      const tabToRemove = state.tabs.get(id);

      // Prevent closing pinned tabs
      if (tabToRemove?.pinned) {
        return state;
      }

      const newTabs = new Map(state.tabs);
      newTabs.delete(id);

      // Find next active tab
      let nextActiveId: string | null = null;
      if (state.activeId === id) {
        // Try to find tab in same mode
        const sameModeTab = Array.from(newTabs.values()).find(
          t => t.appMode === tabToRemove?.appMode
        );
        nextActiveId = sameModeTab?.id ?? Array.from(newTabs.keys())[0] ?? null;
      } else {
        nextActiveId = state.activeId;
      }

      // If no tabs left, create a new blank tab
      if (newTabs.size === 0) {
        const blankTabId = generateTabId();
        newTabs.set(blankTabId, {
          id: blankTabId,
          title: 'New Tab',
          url: 'about:blank',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        });
        nextActiveId = blankTabId;
      }

      return {
        ...state,
        tabs: newTabs,
        activeId: nextActiveId,
      };
    }

    case 'UPDATE_TAB': {
      const { id, updates } = action.payload;
      const existingTab = state.tabs.get(id);

      if (!existingTab) {
        console.warn('[TabReducer] updateTab: Tab not found', id);
        return state;
      }

      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...existingTab, ...updates });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'NAVIGATE_TAB': {
      const { id, url } = action.payload;
      const tab = state.tabs.get(id);

      if (!tab) {
        return state;
      }

      const history = tab.history || [];
      const historyIndex = tab.historyIndex ?? history.length - 1;

      // Truncate forward history if not at end
      const newHistory =
        historyIndex < history.length - 1 ? history.slice(0, historyIndex + 1) : history;

      const newEntry = {
        url,
        title: tab.title,
        timestamp: Date.now(),
      };

      const newTabs = new Map(state.tabs);
      newTabs.set(id, {
        ...tab,
        url,
        history: [...newHistory, newEntry],
        historyIndex: newHistory.length,
      });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'GO_BACK': {
      const { id } = action.payload;
      const tab = state.tabs.get(id);

      if (!tab || !tab.history || tab.historyIndex === undefined || tab.historyIndex <= 0) {
        return state;
      }

      const newIndex = tab.historyIndex - 1;
      const entry = tab.history[newIndex];

      const newTabs = new Map(state.tabs);
      newTabs.set(id, {
        ...tab,
        url: entry.url,
        title: entry.title || tab.title,
        historyIndex: newIndex,
      });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'GO_FORWARD': {
      const { id } = action.payload;
      const tab = state.tabs.get(id);

      if (
        !tab ||
        !tab.history ||
        tab.historyIndex === undefined ||
        tab.historyIndex >= tab.history.length - 1
      ) {
        return state;
      }

      const newIndex = tab.historyIndex + 1;
      const entry = tab.history[newIndex];

      const newTabs = new Map(state.tabs);
      newTabs.set(id, {
        ...tab,
        url: entry.url,
        title: entry.title || tab.title,
        historyIndex: newIndex,
      });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'PIN_TAB': {
      const { id } = action.payload;
      const tab = state.tabs.get(id);

      if (!tab) {
        return state;
      }

      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, pinned: true });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'UNPIN_TAB': {
      const { id } = action.payload;
      const tab = state.tabs.get(id);

      if (!tab) {
        return state;
      }

      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, pinned: false });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    case 'REMEMBER_CLOSED': {
      const { tab } = action.payload;
      const entry: ClosedTab = {
        closedId: tab.id,
        title: tab.title,
        url: tab.url,
        appMode: tab.appMode,
        mode: tab.mode,
        containerId: tab.containerId,
        containerName: tab.containerName,
        containerColor: tab.containerColor,
        groupId: tab.groupId,
        closedAt: Date.now(),
      };

      const newRecentlyClosed = [
        entry,
        ...state.recentlyClosed.filter(item => item.closedId !== tab.id),
      ].slice(0, MAX_RECENTLY_CLOSED);

      return {
        ...state,
        recentlyClosed: newRecentlyClosed,
      };
    }

    case 'POP_RECENTLY_CLOSED': {
      if (state.recentlyClosed.length === 0) {
        return state;
      }

      const [, ...rest] = state.recentlyClosed;
      return {
        ...state,
        recentlyClosed: rest,
      };
    }

    case 'CLEAR_RECENTLY_CLOSED': {
      return {
        ...state,
        recentlyClosed: [],
      };
    }

    case 'CREATE_GROUP': {
      const { group } = action.payload;
      const newGroups = new Map(state.tabGroups);
      newGroups.set(group.id, group);

      return {
        ...state,
        tabGroups: newGroups,
      };
    }

    case 'UPDATE_GROUP': {
      const { id, updates } = action.payload;
      const existingGroup = state.tabGroups.get(id);

      if (!existingGroup) {
        return state;
      }

      const newGroups = new Map(state.tabGroups);
      newGroups.set(id, { ...existingGroup, ...updates });

      return {
        ...state,
        tabGroups: newGroups,
      };
    }

    case 'DELETE_GROUP': {
      const { id } = action.payload;
      const newGroups = new Map(state.tabGroups);
      newGroups.delete(id);

      // Remove groupId from tabs
      const newTabs = new Map(state.tabs);
      for (const [tabId, tab] of newTabs.entries()) {
        if (tab.groupId === id) {
          newTabs.set(tabId, { ...tab, groupId: undefined });
        }
      }

      return {
        ...state,
        tabs: newTabs,
        tabGroups: newGroups,
      };
    }

    case 'ASSIGN_TAB_TO_GROUP': {
      const { tabId, groupId } = action.payload;
      const tab = state.tabs.get(tabId);

      if (!tab) {
        return state;
      }

      const newTabs = new Map(state.tabs);
      newTabs.set(tabId, { ...tab, groupId: groupId || undefined });

      return {
        ...state,
        tabs: newTabs,
      };
    }

    default:
      return state;
  }
}

/**
 * Initial tab state
 */
export function createInitialTabState(): TabState {
  return {
    tabs: new Map(),
    activeId: null,
    recentlyClosed: [],
    tabGroups: new Map(),
  };
}
