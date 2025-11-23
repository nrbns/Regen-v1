/**
 * Extension Injector
 * Injects Chrome Extension APIs into web pages
 */

import { WebContents } from 'electron';
import { getChromeExtensionAdapter, LoadedExtension } from './chrome-api-adapter';
import { createChromeRuntime } from './chrome-runtime';
import { createChromeStorage } from './chrome-storage';

/**
 * Inject Chrome Extension APIs into a web page
 */
export async function injectChromeAPIs(
  webContents: WebContents,
  extensionId: string,
  _extension: LoadedExtension
): Promise<void> {
  const runtime = createChromeRuntime(extensionId);
  const storage = createChromeStorage(extensionId);

  // Create chrome API object
  const chromeAPI = {
    runtime: {
      id: runtime.id,
      getURL: (path: string) => runtime.getURL(path),
      sendMessage: (message: unknown, responseCallback?: (response: unknown) => void) =>
        runtime.sendMessage(message, responseCallback),
      onMessage: {
        addListener: (
          callback: (
            message: unknown,
            sender: unknown,
            sendResponse: (response: unknown) => void
          ) => void
        ) => runtime.onMessage(callback),
        removeListener: (callback: (...args: any[]) => void) =>
          runtime.removeListener('message', callback),
      },
      connect: (connectInfo?: { name?: string }) => runtime.connect(connectInfo),
      getLastError: () => runtime.getLastError(),
      reload: () => runtime.reload(),
      getManifest: () => runtime.getManifest(),
    },
    storage: {
      local: {
        get: (keys?: string | string[] | Record<string, unknown> | null) => storage.local.get(keys),
        set: (items: Record<string, unknown>) => storage.local.set(items),
        remove: (keys: string | string[]) => storage.local.remove(keys),
        clear: () => storage.local.clear(),
        getBytesInUse: (keys?: string | string[] | null) => storage.local.getBytesInUse(keys),
      },
      sync: {
        get: (keys?: string | string[] | Record<string, unknown> | null) => storage.sync.get(keys),
        set: (items: Record<string, unknown>) => storage.sync.set(items),
        remove: (keys: string | string[]) => storage.sync.remove(keys),
        clear: () => storage.sync.clear(),
        getBytesInUse: (keys?: string | string[] | null) => storage.sync.getBytesInUse(keys),
      },
      onChanged: {
        addListener: (callback: (changes: unknown, areaName: string) => void) => {
          storage.local.onChanged(callback);
        },
      },
    },
  };

  // Inject chrome API into page
  const injectionCode = `
    (function() {
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.id === '${extensionId}') {
        return; // Already injected
      }
      
      // Create chrome object if it doesn't exist
      if (!window.chrome) {
        window.chrome = {};
      }
      
      // Inject APIs
      Object.assign(window.chrome, ${JSON.stringify(chromeAPI)});
      
      // Make it non-configurable for security
      Object.defineProperty(window, 'chrome', {
        value: window.chrome,
        writable: false,
        configurable: false,
      });
    })();
  `;

  try {
    await webContents.executeJavaScript(injectionCode, true);
  } catch (error) {
    console.error(`[ExtensionInjector] Failed to inject Chrome APIs for ${extensionId}:`, error);
  }
}

/**
 * Setup extension injection for a tab
 */
export async function setupExtensionInjection(
  webContents: WebContents,
  url: string
): Promise<void> {
  const adapter = getChromeExtensionAdapter();
  const extensions = adapter.listExtensions();

  for (const extension of extensions) {
    if (!extension.enabled) continue;

    // Check if extension should run on this URL
    const shouldInject = extension.manifest.content_scripts?.some(script =>
      script.matches.some(pattern => {
        try {
          new URL(url); // Validate URL format
          // Simplified pattern matching
          return pattern === '<all_urls>' || url.includes(pattern.replace(/\*/g, ''));
        } catch {
          return false;
        }
      })
    );

    if (shouldInject) {
      await injectChromeAPIs(webContents, extension.id, extension);

      // Inject content scripts
      await adapter.injectContentScripts(webContents, url);
    }
  }
}
