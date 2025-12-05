/**
 * Unit Tests for TabsStore - Tier 1
 * Tests core tab management functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTabsStore } from './tabsStore';
// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
// Mock session service
vi.mock('../services/session', () => ({
    debouncedSaveSession: vi.fn(),
}));
// Mock analytics
vi.mock('../services/analytics', () => ({
    track: vi.fn(),
}));
describe('TabsStore', () => {
    beforeEach(() => {
        localStorageMock.clear();
        // Reset store to initial state
        useTabsStore.setState({
            tabs: [],
            activeId: null,
            recentlyClosed: [],
            tabGroups: [],
        });
    });
    describe('Tab Management', () => {
        it('should add a new tab', () => {
            const store = useTabsStore.getState();
            const newTab = {
                id: 'tab-1',
                title: 'New Tab',
                url: 'https://example.com',
            };
            store.add(newTab);
            const state = useTabsStore.getState();
            expect(state.tabs).toHaveLength(1);
            expect(state.tabs[0].id).toBe('tab-1');
            expect(state.activeId).toBe('tab-1');
        });
        it('should set active tab', () => {
            const store = useTabsStore.getState();
            const tab1 = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            const tab2 = { id: 'tab-2', title: 'Tab 2', url: 'https://google.com' };
            store.add(tab1);
            store.add(tab2);
            store.setActive('tab-1');
            const state = useTabsStore.getState();
            expect(state.activeId).toBe('tab-1');
            expect(state.tabs.find(t => t.id === 'tab-1')?.active).toBe(true);
            expect(state.tabs.find(t => t.id === 'tab-2')?.active).toBe(false);
        });
        it('should remove a tab', () => {
            const store = useTabsStore.getState();
            const tab1 = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            const tab2 = { id: 'tab-2', title: 'Tab 2', url: 'https://google.com' };
            store.add(tab1);
            store.add(tab2);
            store.remove('tab-1');
            const state = useTabsStore.getState();
            expect(state.tabs).toHaveLength(1);
            expect(state.tabs[0].id).toBe('tab-2');
        });
        it('should not remove pinned tabs', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com', pinned: true };
            store.add(tab);
            store.remove('tab-1');
            const state = useTabsStore.getState();
            expect(state.tabs).toHaveLength(1); // Tab should still exist
        });
        it('should enforce tab limit', () => {
            const store = useTabsStore.getState();
            const MAX_TABS = 15;
            // Add max tabs
            for (let i = 0; i < MAX_TABS; i++) {
                store.add({ id: `tab-${i}`, title: `Tab ${i}`, url: `https://example${i}.com` });
            }
            // Try to add one more
            store.add({ id: 'tab-overflow', title: 'Overflow', url: 'https://overflow.com' });
            const state = useTabsStore.getState();
            expect(state.tabs).toHaveLength(MAX_TABS);
            expect(state.tabs.find(t => t.id === 'tab-overflow')).toBeUndefined();
        });
    });
    describe('History Navigation', () => {
        it('should navigate tab and add to history', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.navigateTab('tab-1', 'https://google.com');
            const state = useTabsStore.getState();
            const updatedTab = state.tabs.find(t => t.id === 'tab-1');
            expect(updatedTab?.url).toBe('https://google.com');
            expect(updatedTab?.history).toHaveLength(2);
            expect(updatedTab?.historyIndex).toBe(1);
        });
        it('should go back in history', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.navigateTab('tab-1', 'https://google.com');
            store.navigateTab('tab-1', 'https://github.com');
            store.goBack('tab-1');
            const state = useTabsStore.getState();
            const updatedTab = state.tabs.find(t => t.id === 'tab-1');
            expect(updatedTab?.url).toBe('https://google.com');
            expect(updatedTab?.historyIndex).toBe(1);
        });
        it('should go forward in history', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.navigateTab('tab-1', 'https://google.com');
            store.navigateTab('tab-1', 'https://github.com');
            store.goBack('tab-1');
            store.goForward('tab-1');
            const state = useTabsStore.getState();
            const updatedTab = state.tabs.find(t => t.id === 'tab-1');
            expect(updatedTab?.url).toBe('https://github.com');
            expect(updatedTab?.historyIndex).toBe(2);
        });
        it('should check if can go back', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            expect(store.canGoBack('tab-1')).toBe(false);
            store.navigateTab('tab-1', 'https://google.com');
            expect(store.canGoBack('tab-1')).toBe(true);
        });
        it('should check if can go forward', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.navigateTab('tab-1', 'https://google.com');
            store.navigateTab('tab-1', 'https://github.com');
            store.goBack('tab-1');
            expect(store.canGoForward('tab-1')).toBe(true);
            store.goForward('tab-1');
            expect(store.canGoForward('tab-1')).toBe(false);
        });
    });
    describe('Recently Closed Tabs', () => {
        it('should remember closed tab', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.rememberClosedTab(tab);
            store.remove('tab-1');
            const state = useTabsStore.getState();
            expect(state.recentlyClosed).toHaveLength(1);
            expect(state.recentlyClosed[0].closedId).toBe('tab-1');
        });
        it('should pop recently closed tab', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            store.add(tab);
            store.rememberClosedTab(tab);
            store.remove('tab-1');
            const closed = store.popRecentlyClosed();
            expect(closed?.closedId).toBe('tab-1');
            const state = useTabsStore.getState();
            expect(state.recentlyClosed).toHaveLength(0);
        });
    });
    describe('Tab Groups', () => {
        it('should create a tab group', () => {
            const store = useTabsStore.getState();
            const group = store.createGroup({ name: 'Work', color: '#6366f1' });
            expect(group.name).toBe('Work');
            expect(group.color).toBe('#6366f1');
            const state = useTabsStore.getState();
            expect(state.tabGroups).toHaveLength(1);
        });
        it('should assign tab to group', () => {
            const store = useTabsStore.getState();
            const tab = { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' };
            const group = store.createGroup({ name: 'Work' });
            store.add(tab);
            store.assignTabToGroup('tab-1', group.id);
            const state = useTabsStore.getState();
            expect(state.tabs.find(t => t.id === 'tab-1')?.groupId).toBe(group.id);
        });
    });
});
