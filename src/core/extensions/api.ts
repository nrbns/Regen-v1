/**
 * Basic Extension API
 * Chrome-compatible extension API for RegenBrowser
 */

// Basic Chrome extension API compatibility layer
export interface ChromeExtensionAPI {
  tabs?: {
    query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<
      Array<{
        id?: number;
        url?: string;
        title?: string;
      }>
    >;
    create: (createProperties: { url?: string }) => Promise<{ id?: number }>;
    update: (tabId: number, updateProperties: { url?: string }) => Promise<void>;
  };
  runtime?: {
    sendMessage: (message: unknown, responseCallback?: (response: unknown) => void) => void;
    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response: unknown) => void
        ) => void
      ) => void;
    };
  };
  storage?: {
    local: {
      get: (
        keys: string | string[] | null,
        callback: (items: Record<string, unknown>) => void
      ) => void;
      set: (items: Record<string, unknown>, callback?: () => void) => void;
    };
  };
}

// Create a basic Chrome API shim
export function createChromeExtensionAPI(): ChromeExtensionAPI {
  return {
    tabs: {
      async query(queryInfo) {
        const { ipc } = await import('../../lib/ipc-typed');
        const tabs = await ipc.tabs.list();
        const activeTab = Array.isArray(tabs) ? tabs.find(t => t.active) : null;

        if (queryInfo.active && queryInfo.currentWindow) {
          return activeTab
            ? [
                {
                  id: parseInt(activeTab.id) || 0,
                  url: activeTab.url,
                  title: activeTab.title,
                },
              ]
            : [];
        }

        return Array.isArray(tabs)
          ? tabs.map(tab => ({
              id: parseInt(tab.id) || 0,
              url: tab.url,
              title: tab.title,
            }))
          : [];
      },
      async create(createProperties) {
        const { ipc } = await import('../../lib/ipc-typed');
        const result = await ipc.tabs.create({
          url: createProperties.url || 'about:blank',
        });
        return {
          id:
            typeof result === 'object' && result && 'id' in result
              ? parseInt(String(result.id)) || 0
              : 0,
        };
      },
      async update(tabId, updateProperties) {
        const { ipc } = await import('../../lib/ipc-typed');
        await ipc.tabs.navigate(String(tabId), updateProperties.url || 'about:blank');
      },
    },
    runtime: {
      sendMessage(message, responseCallback) {
        // Basic message passing - can be enhanced
        console.log('[ExtensionAPI] sendMessage:', message);
        if (responseCallback) {
          responseCallback({ success: true });
        }
      },
      onMessage: {
        addListener(callback) {
          // Listen for messages - can be enhanced with event system
          window.addEventListener('extension:message', (event: any) => {
            callback(event.detail.message, event.detail.sender, (response: unknown) => {
              window.dispatchEvent(new CustomEvent('extension:response', { detail: response }));
            });
          });
        },
      },
    },
    storage: {
      local: {
        get(keys, callback) {
          const result: Record<string, unknown> = {};
          const keyArray = Array.isArray(keys) ? keys : keys ? [keys] : [];

          keyArray.forEach(key => {
            try {
              const value = localStorage.getItem(`extension:${key}`);
              if (value !== null) {
                result[key] = JSON.parse(value);
              }
            } catch (error) {
              console.warn(`[ExtensionAPI] Failed to get storage key: ${key}`, error);
            }
          });

          callback(result);
        },
        set(items, callback) {
          Object.entries(items).forEach(([key, value]) => {
            try {
              localStorage.setItem(`extension:${key}`, JSON.stringify(value));
            } catch (error) {
              console.warn(`[ExtensionAPI] Failed to set storage key: ${key}`, error);
            }
          });

          if (callback) {
            callback();
          }
        },
      },
    },
  };
}

// Initialize Chrome API on window
export function initializeExtensionAPI(): void {
  if (typeof window !== 'undefined' && !(window as any).chrome) {
    (window as any).chrome = createChromeExtensionAPI();
    console.log('[ExtensionAPI] Chrome extension API initialized');
  }
}
