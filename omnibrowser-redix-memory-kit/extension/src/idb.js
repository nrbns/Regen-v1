/* eslint-env browser */
/* global chrome */

const QUEUE_KEY = "memoryQueue";

export async function getQueue() {
  const stored = await chrome.storage.local.get({ [QUEUE_KEY]: [] });
  return stored[QUEUE_KEY] ?? [];
}

export async function appendToQueue(item) {
  const queue = await getQueue();
  queue.push(item);
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

export async function clearQueue() {
  await chrome.storage.local.set({ [QUEUE_KEY]: [] });
}

