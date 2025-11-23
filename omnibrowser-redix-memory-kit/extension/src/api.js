/* eslint-env browser */
/* global chrome */

const DEFAULT_SETTINGS = {
  MEMORY_BASE: 'http://localhost:8080',
  JWT: 'dev',
  SYNC_ENABLED: false,
  MODE: 'research',
  TENANT: 'dev',
  USER: 'u42',
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(nextSettings) {
  await chrome.storage.local.set(nextSettings);
}

export class MemoryClient {
  constructor(settings) {
    this.baseUrl = settings.MEMORY_BASE.replace(/\/$/, '');
    this.jwt = settings.JWT;
    this.tenant = settings.TENANT;
    this.user = settings.USER;
  }

  static async create() {
    const settings = await getSettings();
    return new MemoryClient(settings);
  }

  async writeMemory(payload) {
    const response = await fetch(`${this.baseUrl}/v1/memory.write`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to write memory: ${response.status} ${text}`);
    }

    return response.json();
  }

  async search(query, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/memory.search`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({
        query,
        ...options,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Search failed: ${response.status} ${text}`);
    }

    return response.json();
  }

  #headers() {
    const headers = {
      'Content-Type': 'application/json',
      'x-tenant': this.tenant,
      'x-user': this.user,
    };
    if (this.jwt) {
      headers.Authorization = `Bearer ${this.jwt}`;
    }
    return headers;
  }
}
