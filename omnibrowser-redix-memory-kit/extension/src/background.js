import { MemoryClient, getSettings, updateSettings } from "./api.js";
import { appendToQueue, clearQueue, getQueue } from "./idb.js";
import { cycleMode, getCurrentMode } from "./modes.js";

const FLUSH_ALARM = "memory-flush";
const FLUSH_INTERVAL_MINUTES = 0.5; // 30 seconds

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await updateSettings(settings); // ensure defaults are committed
  scheduleFlush();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleFlush();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "cycle-mode") {
    const nextMode = await cycleMode();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "mode-changed", mode: nextMode }).catch(() => {
        /* ignore */
      });
      await snapshotTab(tab.id, nextMode);
    }
  }
  if (command === "open-omnibar") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "toggle-omnibar" }).catch(() => {
        /* ignore */
      });
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const mode = await getCurrentMode();
  await snapshotTab(activeInfo.tabId, mode);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const mode = await getCurrentMode();
    await snapshotTab(tabId, mode);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    await flushQueue();
  }
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    await flushQueue();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "memory:enqueue") {
    (async () => {
      await appendToQueue(message.payload);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type == "memory:get-mode") {
    (async () => {
      const mode = await getCurrentMode();
      sendResponse({ ok: true, mode });
    })();
    return true;
  }
  if (message?.type === "memory:flush-now") {
    (async () => {
      try {
        await flushQueue();
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }
  if (message?.type === "memory:search") {
    (async () => {
      try {
        const client = await MemoryClient.create();
        const response = await client.search(message.query, message.options);
        sendResponse({ ok: true, data: response });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }
});

function scheduleFlush() {
  chrome.alarms.create(FLUSH_ALARM, {
    periodInMinutes: FLUSH_INTERVAL_MINUTES,
    delayInMinutes: FLUSH_INTERVAL_MINUTES,
  });
}

async function snapshotTab(tabId, mode) {
  const settings = await getSettings();
  if (!settings.SYNC_ENABLED) {
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "collect-snapshot" });
    if (!response) return;
    const payload = createTabPayload(response, mode);
    await appendToQueue(payload);
  } catch (error) {
    // Likely means the tab does not accept messages (chrome://, etc).
  }
}

function createTabPayload(snapshot, mode) {
  return {
    project: "omnibrowser",
    type: "tab",
    title: snapshot.title,
    text: snapshot.text.slice(0, 1000),
    mode,
    tags: [`mode:${mode}`, `url:${snapshot.url}`],
    origin: {
      app: "omnibrowser",
      mode,
      url: snapshot.url,
    },
    rich: {
      metadata: snapshot.metadata || {},
    },
    created_at: new Date().toISOString(),
  };
}

async function flushQueue() {
  const settings = await getSettings();
  if (!settings.SYNC_ENABLED) {
    return;
  }

  const queue = await getQueue();
  if (!queue.length) {
    return;
  }

  const client = await MemoryClient.create();
  const remaining = [];

  for (const item of queue) {
    try {
      await client.writeMemory(item);
    } catch (error) {
      remaining.push(item);
    }
  }

  if (remaining.length) {
    await chrome.storage.local.set({ memoryQueue: remaining });
  } else {
    await clearQueue();
  }
}

