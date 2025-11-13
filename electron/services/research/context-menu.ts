/**
 * Research Context Menu - Right-click menu for "Add to Research"
 */

import { Menu, BrowserWindow, WebContents } from 'electron';

let researchContextMenu: Electron.Menu | null = null;

/**
 * Build the research context menu
 */
function buildResearchContextMenu() {
  if (researchContextMenu) {
    return researchContextMenu;
  }

  researchContextMenu = Menu.buildFromTemplate([
    {
      label: 'Add to Research',
      click: (_, browserWindow) => {
        if (browserWindow && browserWindow instanceof BrowserWindow) {
          // Get the active BrowserView
          const views = browserWindow.getBrowserViews();
          const view = views.length > 0 ? views[views.length - 1] : null;
          
          if (view) {
            // Send IPC message to capture page
            view.webContents.send('research:context-menu:capture');
          }
        }
      },
    },
    {
      label: 'Capture Selection',
      click: (_, browserWindow) => {
        if (browserWindow && browserWindow instanceof BrowserWindow) {
          const views = browserWindow.getBrowserViews();
          const view = views.length > 0 ? views[views.length - 1] : null;
          
          if (view) {
            view.webContents.send('research:context-menu:capture-selection');
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Open Research Pane',
      click: (_, browserWindow) => {
        if (browserWindow && browserWindow instanceof BrowserWindow) {
          browserWindow.webContents.send('research:context-menu:open-pane');
        }
      },
    },
  ]);

  return researchContextMenu;
}

/**
 * Setup context menu for BrowserView webContents
 */
export function setupContextMenuForView(webContents: WebContents, browserWindow: BrowserWindow) {
  webContents.on('context-menu', (event, params) => {
    // Only show on web pages (not special pages)
    const url = webContents.getURL();
    if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
      return;
    }

    const menu = buildResearchContextMenu();
    menu.popup({
      window: browserWindow,
      x: params.x,
      y: params.y,
    });
  });
}

/**
 * Register global keyboard shortcuts
 */
export function registerResearchShortcuts() {
  // Register global shortcuts (these would be handled in main.ts)
  // For now, we'll use IPC to handle shortcuts from renderer
}

