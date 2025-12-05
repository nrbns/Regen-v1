import { createSnapshot } from '../core/recovery/snapshot';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from './ipc-typed';
import { toast } from '../utils/toast';
const SESSION_FILE_VERSION = 1;
const SESSION_FILE_KIND = 'regen.session';
function downloadJsonFile(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
async function restoreSnapshot(snapshot) {
    const tabsStore = useTabsStore.getState();
    const tabs = [...tabsStore.tabs];
    for (const tab of tabs) {
        try {
            await ipc.tabs.close({ id: tab.id });
        }
        catch {
            // ignore
        }
    }
    if (snapshot.mode) {
        await useAppStore.getState().setMode(snapshot.mode);
    }
    let firstTabId = null;
    for (const tab of snapshot.tabs) {
        try {
            const created = await ipc.tabs.create(tab.url || 'about:blank');
            const tabId = typeof created === 'object' && created && 'id' in created
                ? created.id
                : typeof created === 'string'
                    ? created
                    : null;
            if (tabId) {
                if (!firstTabId)
                    firstTabId = tabId;
                tabsStore.updateTab(tabId, {
                    title: tab.title,
                    url: tab.url,
                    appMode: tab.appMode,
                });
            }
        }
        catch (error) {
            console.warn('[SessionTransfer] Failed to recreate tab', tab, error);
        }
    }
    const targetActive = snapshot.activeTabId || firstTabId;
    if (targetActive) {
        tabsStore.setActive(targetActive);
        await ipc.tabs.activate({ id: targetActive }).catch(() => { });
    }
}
export async function exportSessionToFile() {
    try {
        const snapshot = createSnapshot();
        const payload = {
            kind: SESSION_FILE_KIND,
            version: SESSION_FILE_VERSION,
            exportedAt: new Date().toISOString(),
            snapshot,
        };
        const filename = `regen-session-${new Date()
            .toISOString()
            .replace(/[:]/g, '-')
            .slice(0, 19)}.omnisession`;
        downloadJsonFile(payload, filename);
        toast.success('Session exported (.omnisession)');
    }
    catch (error) {
        console.error('[SessionTransfer] Export failed', error);
        toast.error('Failed to export session');
    }
}
export async function importSessionFromFile(file) {
    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (payload.kind !== SESSION_FILE_KIND || payload.version !== SESSION_FILE_VERSION) {
            throw new Error('Unsupported session file format');
        }
        await restoreSnapshot(payload.snapshot);
        toast.success('Session imported successfully');
    }
    catch (error) {
        console.error('[SessionTransfer] Import failed', error);
        toast.error('Failed to import session');
    }
}
