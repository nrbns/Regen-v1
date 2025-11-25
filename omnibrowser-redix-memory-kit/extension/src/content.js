/* eslint-env browser */
/* global chrome, document, window, location */

import { ensureOmnibar, toggleOmnibar, updateResults, updateModeLabel } from './omnibar.js';

let currentMode = 'research';

async function initMode() {
  const stored = await chrome.storage.local.get({ MODE: 'research' });
  currentMode = stored.MODE;
  updateModeLabel(currentMode);
}

initMode().catch(() => {
  /* ignore */
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'collect-snapshot') {
    const snapshot = collectSnapshot();
    sendResponse(snapshot);
    return;
  }

  if (message?.type === 'toggle-omnibar') {
    ensureOmnibar();
    toggleOmnibar();
    updateModeLabel(currentMode);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === 'mode-changed') {
    currentMode = message.mode;
    updateModeLabel(currentMode);
    sendResponse({ ok: true });
    return;
  }
});

document.addEventListener(
  'mouseup',
  async event => {
    if (!event.altKey) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    const bounding = selection.getRangeAt(0).getBoundingClientRect();
    const notePayload = {
      project: 'regen',
      type: 'note',
      title: document.title,
      text,
      mode: currentMode,
      tags: [`mode:${currentMode}`, 'note'],
      origin: {
        app: 'regen',
        mode: currentMode,
        url: location.href,
        position: {
          x: bounding.x,
          y: bounding.y,
        },
      },
      created_at: new Date().toISOString(),
    };

    await chrome.runtime.sendMessage({ type: 'memory:enqueue', payload: notePayload });
  },
  true
);

async function handleSearch(query) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'memory:search',
      query,
      options: {
        filters: {
          project: 'regen',
          mode: currentMode,
        },
      },
    });
    if (response?.ok) {
      updateResults(response.data?.results || []);
    } else {
      updateResults([], response?.error || 'Search failed');
    }
  } catch (error) {
    updateResults([], error.message);
  }
}

document.addEventListener('omnibar:search', async event => {
  const query = event.detail?.query || '';
  if (!query) return;
  await handleSearch(query);
});

function collectSnapshot() {
  return {
    title: document.title,
    url: location.href,
    text: document.body?.innerText || '',
    metadata: {
      lastModified: document.lastModified,
    },
  };
}
