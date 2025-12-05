// @ts-nocheck
import { ipc } from '../../lib/ipc-typed';
import { ipcEvents } from '../../lib/ipc-events';
import { isElectronRuntime } from '../../lib/env';
import { useTabSuspensionStore } from '../../state/tabSuspensionStore';
import { useTabsStore } from '../../state/tabsStore';
import { dispatch } from './runtime';
import { loadPolicy, getPolicy } from './optimizer';
const MIN_INACTIVITY_MINUTES = 5;
const EVALUATION_INTERVAL = 60 * 1000;
const DEFAULT_CAPTURE_WIDTH = 640;
let initialized = false;
let evaluateTimer = null;
let latestTabs = [];
const suspendQueue = new Set();
// Cleanup function to prevent memory leaks
function cleanupStaleData() {
    // Remove tabs from latestTabs that no longer exist
    const currentTabIds = new Set(useTabsStore.getState().tabs.map(t => t.id));
    latestTabs = latestTabs.filter(tab => currentTabIds.has(tab.id));
    // Clean up suspend queue for tabs that no longer exist
    suspendQueue.forEach(tabId => {
        if (!currentTabIds.has(tabId)) {
            suspendQueue.delete(tabId);
        }
    });
    // Clean up suspensions for closed tabs
    const suspensionStore = useTabSuspensionStore.getState();
    Object.keys(suspensionStore.suspensions).forEach(tabId => {
        if (!currentTabIds.has(tabId)) {
            suspensionStore.resolve(tabId, { silent: true });
        }
    });
}
export function startTabSuspensionService() {
    if (initialized || typeof window === 'undefined' || !isElectronRuntime()) {
        return;
    }
    initialized = true;
    let inactivityThresholdMs = MIN_INACTIVITY_MINUTES * 60 * 1000;
    // Load persisted policy if present
    loadPolicy()
        .then(policy => {
        if (policy?.suspendAfterMinutes) {
            inactivityThresholdMs = Math.max(1, policy.suspendAfterMinutes) * 60 * 1000;
        }
    })
        .catch(() => {
        const policy = getPolicy?.();
        if (policy?.suspendAfterMinutes) {
            inactivityThresholdMs = Math.max(1, policy.suspendAfterMinutes) * 60 * 1000;
        }
    });
    const handleTabsUpdated = (payload) => {
        if (Array.isArray(payload)) {
            latestTabs = payload;
            cleanupStaleData(); // Clean up stale data first
            cleanupResolvedSuspensions();
        }
    };
    const unsubscribeTabs = ipcEvents.on('tabs:updated', handleTabsUpdated);
    // Ensure we react when tabs close or active tab changes
    const unsubscribeActive = useTabsStore.subscribe(state => state.activeId, (activeId, previous) => {
        if (!activeId || activeId === previous)
            return;
        const target = useTabsStore.getState().tabs.find(tab => tab.id === activeId);
        if (target?.sleeping) {
            resumeSuspendedTab(activeId, { activate: false });
        }
        else {
            useTabSuspensionStore.getState().resolve(activeId, { silent: true });
        }
    });
    const unsubscribeTabsStore = useTabsStore.subscribe(state => state.tabs, () => {
        cleanupResolvedSuspensions();
    });
    evaluateTimer = setInterval(() => {
        cleanupStaleData(); // Clean up stale data periodically
        evaluateSuspensions(inactivityThresholdMs).catch(() => { });
    }, EVALUATION_INTERVAL);
    // Run an immediate pass once tabs list is available
    evaluateSuspensions(inactivityThresholdMs).catch(() => { });
    // Attach cleanup to window unload
    window.addEventListener('beforeunload', () => {
        unsubscribeTabs();
        unsubscribeActive();
        unsubscribeTabsStore();
        if (evaluateTimer) {
            clearInterval(evaluateTimer);
        }
    }, { once: true });
}
async function evaluateSuspensions(thresholdMs) {
    if (!ipc?.tabs?.list)
        return;
    let tabs = latestTabs;
    if (!tabs.length) {
        const list = await ipc.tabs.list().catch(() => []);
        if (Array.isArray(list)) {
            tabs = list;
            latestTabs = tabs;
        }
    }
    if (!tabs.length)
        return;
    const now = Date.now();
    for (const tab of tabs) {
        if (shouldAutoSuspend(tab, now, thresholdMs)) {
            await suspendTabWithSnapshot(tab, 'inactivity');
        }
    }
}
function shouldAutoSuspend(tab, now, thresholdMs) {
    if (!tab || !tab.id)
        return false;
    if (tab.active)
        return false;
    if (tab.sleeping)
        return false;
    if (tab.pinned)
        return false;
    if (!tab.url ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('chrome:') ||
        tab.url.startsWith('edge:')) {
        return false;
    }
    const lastActive = tab.lastActiveAt ?? tab.createdAt ?? 0;
    if (!lastActive)
        return false;
    return now - lastActive >= thresholdMs;
}
async function suspendTabWithSnapshot(tab, reason) {
    if (!ipc?.tabs?.hibernate || suspendQueue.has(tab.id))
        return;
    suspendQueue.add(tab.id);
    try {
        let snapshot = null;
        if (ipc.tabs.capturePreview) {
            try {
                const preview = await ipc.tabs.capturePreview({
                    id: tab.id,
                    maxWidth: DEFAULT_CAPTURE_WIDTH,
                    quality: 0.65,
                });
                if (preview?.success && preview.dataUrl) {
                    snapshot = preview.dataUrl;
                }
            }
            catch {
                // Ignore preview errors — suspension still proceeds
            }
        }
        await ipc.tabs.hibernate({ id: tab.id });
        useTabSuspensionStore.getState().setSuspended({
            tabId: tab.id,
            title: tab.title,
            url: tab.url,
            snapshot,
            suspendedAt: Date.now(),
            lastActiveAt: tab.lastActiveAt,
            reason,
        });
        dispatch({
            type: 'redix:tab:suspended',
            payload: { tabId: tab.id, reason },
        });
    }
    catch (error) {
        console.warn('[Redix] Failed to suspend tab', tab?.id, error);
    }
    finally {
        suspendQueue.delete(tab.id);
    }
}
function cleanupResolvedSuspensions() {
    const state = useTabSuspensionStore.getState();
    const tabMap = new Map(latestTabs.map(tab => [tab.id, tab]));
    const currentTabIds = new Set(useTabsStore.getState().tabs.map(t => t.id));
    // Periodic cleanup of old suspensions
    state.cleanup();
    Object.keys(state.suspensions).forEach(tabId => {
        // Remove suspensions for tabs that no longer exist
        if (!currentTabIds.has(tabId)) {
            state.resolve(tabId, { silent: true });
            return;
        }
        const meta = tabMap.get(tabId);
        // Resolve if tab is no longer sleeping (was resumed or closed)
        if (!meta || !meta.sleeping) {
            state.resolve(tabId, { silent: true });
        }
    });
}
export async function resumeSuspendedTab(tabId, options) {
    if (!ipc?.tabs?.wake) {
        useTabSuspensionStore.getState().resolve(tabId, { silent: true });
        return;
    }
    try {
        await ipc.tabs.wake({ id: tabId });
        useTabSuspensionStore.getState().resolve(tabId);
        dispatch({
            type: 'redix:tab:resumed',
            payload: { tabId },
        });
        if (options?.activate) {
            await ipc.tabs.activate({ id: tabId }).catch(() => { });
        }
    }
    catch (error) {
        console.warn('[Redix] Failed to resume tab', tabId, error);
    }
}
export function acknowledgeSuspendedTab(tabId) {
    useTabSuspensionStore.getState().acknowledge(tabId);
}
export async function manuallySuspendTab(tabId) {
    const tab = latestTabs.find(t => t.id === tabId);
    if (!tab)
        return;
    await suspendTabWithSnapshot(tab, 'manual');
}
