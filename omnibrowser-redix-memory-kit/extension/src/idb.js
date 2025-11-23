/* eslint-env browser */
/* global TextEncoder, TextDecoder, btoa, atob, chrome, crypto */

const QUEUE_KEY = 'memoryQueue';
const KEY_STORAGE_KEY = 'memoryQueueKey';
const STORAGE_VERSION = 1;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.local.set({ [KEY_STORAGE_KEY]: jwk });
  return key;
}

async function getCryptoKey() {
  const stored = await chrome.storage.local.get(KEY_STORAGE_KEY);
  const jwk = stored[KEY_STORAGE_KEY];
  if (!jwk) {
    return generateKey();
  }
  try {
    return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  } catch (error) {
    console.warn('[Redix] Failed to import queue key, regenerating', error);
    return generateKey();
  }
}

async function saveEncryptedQueue(items) {
  const key = await getCryptoKey();
  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(items));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);

  const record = {
    version: STORAGE_VERSION,
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(ciphertext),
  };

  await chrome.storage.local.set({ [QUEUE_KEY]: record });
}

async function decryptQueueRecord(record) {
  const key = await getCryptoKey();
  const ivBuffer = base64ToBuffer(record.iv);
  const dataBuffer = base64ToBuffer(record.data);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    dataBuffer
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

export async function getQueue() {
  const stored = await chrome.storage.local.get(QUEUE_KEY);
  const record = stored[QUEUE_KEY];

  if (!record) {
    return [];
  }

  // Legacy plaintext format (array)
  if (Array.isArray(record)) {
    await saveEncryptedQueue(record);
    return record;
  }

  if (!record || !record.data || !record.iv) {
    console.warn('[Redix] Invalid queue record, resetting');
    await saveEncryptedQueue([]);
    return [];
  }

  try {
    return await decryptQueueRecord(record);
  } catch (error) {
    console.error('[Redix] Failed to decrypt queue, clearing', error);
    await chrome.storage.local.remove([QUEUE_KEY, KEY_STORAGE_KEY]);
    return [];
  }
}

export async function appendToQueue(item) {
  const queue = await getQueue();
  queue.push(item);
  await saveEncryptedQueue(queue);
}

export async function clearQueue() {
  await saveEncryptedQueue([]);
}
