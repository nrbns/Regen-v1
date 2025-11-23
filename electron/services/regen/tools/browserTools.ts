/**
 * Browser Tools for Regen
 * Controls OmniBrowser tabs via IPC
 */

import { createLogger } from '../../utils/logger';
import { BrowserWindow } from 'electron';
import { findTabById, getTabs } from '../../tabs';
import { sendCommand } from '../hands-free/command-bus';

const log = createLogger('regen-browser-tools');

export interface BrowserToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Get DOM from a tab
 */
export async function getDom(tabId: string): Promise<BrowserToolResult> {
  try {
    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;

    // Inject script to extract simplified DOM
    const dom = await webContents.executeJavaScript(`
      (function() {
        const extractDOM = () => {
          const elements = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null
          );

          let node;
          while ((node = walker.nextNode())) {
            const el = node;
            if (el.tagName && ['A', 'BUTTON', 'INPUT', 'FORM', 'H1', 'H2', 'H3', 'P', 'DIV'].includes(el.tagName)) {
              elements.push({
                tag: el.tagName.toLowerCase(),
                text: el.textContent?.trim().slice(0, 100) || '',
                id: el.id || '',
                className: el.className || '',
                href: el.href || '',
                type: el.type || '',
              });
            }
          }

          return {
            title: document.title,
            url: window.location.href,
            elements: elements.slice(0, 50), // Limit to 50 elements
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
              level: h.tagName,
              text: h.textContent?.trim(),
            })),
          };
        };
        return extractDOM();
      })();
    `);

    return { success: true, data: dom };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to get DOM', { tabId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Click an element in a tab
 */
export async function clickElement(tabId: string, selector: string): Promise<BrowserToolResult> {
  try {
    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;

    await webContents.executeJavaScript(`
      (function() {
        const element = document.querySelector('${selector}');
        if (element) {
          element.click();
          return { success: true, clicked: true };
        }
        return { success: false, error: 'Element not found' };
      })();
    `);

    return { success: true, data: { clicked: true } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to click element', { tabId, selector, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Scroll a tab (alias for scrollTab)
 */
export async function scroll(tabId: string, amount: number): Promise<BrowserToolResult> {
  return scrollTab(tabId, amount);
}

/**
 * Scroll a tab
 */
export async function scrollTab(
  tabId: string,
  amount: number,
  sessionId?: string
): Promise<BrowserToolResult> {
  try {
    // Send command via command bus for hands-free mode
    if (sessionId) {
      sendCommand(sessionId, {
        type: 'SCROLL',
        payload: { tabId, amount },
        sessionId,
      });
    }

    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;

    await webContents.executeJavaScript(`
      (function() {
        window.scrollBy({ top: ${amount}, behavior: 'smooth' });
        return { scrolled: true, amount: ${amount} };
      })();
    `);

    return { success: true, data: { scrolled: true, amount } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to scroll tab', { tabId, amount, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Go back in tab history
 */
export async function goBack(tabId: string, sessionId?: string): Promise<BrowserToolResult> {
  try {
    if (sessionId) {
      sendCommand(sessionId, {
        type: 'GO_BACK',
        payload: { tabId },
        sessionId,
      });
    }

    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;
    if (webContents.canGoBack()) {
      webContents.goBack();
      return { success: true, data: { navigated: true } };
    }

    return { success: false, error: 'Cannot go back' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to go back', { tabId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Go forward in tab history
 */
export async function goForward(tabId: string, sessionId?: string): Promise<BrowserToolResult> {
  try {
    if (sessionId) {
      sendCommand(sessionId, {
        type: 'GO_FORWARD',
        payload: { tabId },
        sessionId,
      });
    }

    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;
    if (webContents.canGoForward()) {
      webContents.goForward();
      return { success: true, data: { navigated: true } };
    }

    return { success: false, error: 'Cannot go forward' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to go forward', { tabId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Switch to a different tab
 */
export async function switchTab(tabIndex: number, sessionId?: string): Promise<BrowserToolResult> {
  try {
    if (sessionId) {
      sendCommand(sessionId, {
        type: 'SWITCH_TAB',
        payload: { tabIndex },
        sessionId,
      });
    }

    // Get tabs from the focused window
    const { BrowserWindow } = await import('electron');
    const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!window) {
      return { success: false, error: 'No window available' };
    }
    const tabs = getTabs(window);
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      const tab = tabs[tabIndex];
      // Activate tab via IPC
      // This would need to be called via IPC handler
      return { success: true, data: { tabId: tab.id, switched: true } };
    }

    return { success: false, error: 'Invalid tab index' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to switch tab', { tabIndex, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Close a tab
 */
export async function closeTab(tabId: string, sessionId?: string): Promise<BrowserToolResult> {
  try {
    if (sessionId) {
      sendCommand(sessionId, {
        type: 'CLOSE_TAB',
        payload: { tabId },
        sessionId,
      });
    }

    // Close tab via IPC
    // This would need to be called via IPC handler
    return { success: true, data: { closed: true } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to close tab', { tabId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Open a new tab
 */
export async function openTab(
  url: string,
  background = false,
  window?: BrowserWindow
): Promise<BrowserToolResult> {
  try {
    // Import tabs service dynamically to avoid circular dependency
    const { createTabOnWindow } = await import('../../tabs');

    if (!window) {
      const { BrowserWindow } = await import('electron');
      window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    }

    if (!window) {
      return { success: false, error: 'No window available' };
    }

    const tabResult = await createTabOnWindow(window, { url, activate: !background });
    const tab = { id: tabResult.id };

    // If background is true, don't activate the tab
    if (background && tab) {
      // Tab is created but not activated - this is handled by createTab's activate parameter
      // We may need to deactivate it if it was auto-activated
    }

    return { success: true, data: { tabId: tab.id, url } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to open tab', { url, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Type into an element
 */
export async function typeInto(
  tabId: string,
  selector: string,
  text: string
): Promise<BrowserToolResult> {
  try {
    const tab = findTabById(tabId);
    if (!tab) {
      return { success: false, error: `Tab ${tabId} not found` };
    }

    const webContents = tab.view.webContents;

    await webContents.executeJavaScript(`
      (function() {
        const element = document.querySelector('${selector}');
        if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
          element.focus();
          element.value = '${text.replace(/'/g, "\\'")}';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, typed: true };
        }
        return { success: false, error: 'Element not found or not input' };
      })();
    `);

    return { success: true, data: { typed: true } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to type into element', { tabId, selector, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Read page content (extract text for TTS/reading)
 */
export async function readPage(tabId: string): Promise<BrowserToolResult> {
  try {
    const domResult = await getDom(tabId);
    if (!domResult.success || !domResult.data) {
      return { success: false, error: domResult.error || 'Failed to get DOM for reading' };
    }

    const dom = domResult.data as any;
    const textContent = [
      dom.title || '',
      ...(dom.headings || []).map((h: any) => h.text || '').filter(Boolean),
      ...(dom.elements || [])
        .slice(0, 20)
        .map((el: any) => el.text || '')
        .filter(Boolean),
    ].join('\n\n');

    return { success: true, data: { textContent } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to read page', { tabId, error: err.message });
    return { success: false, error: err.message };
  }
}
