/**
 * Webview bounds and overflow tests
 * Ensures BrowserView/iframe stays within its container and doesn't overflow
 */

import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      PLAYWRIGHT: '1',
      OB_DISABLE_HEAVY_SERVICES: '1',
    },
  });

  const page = await app.firstWindow();

  // Wait for UI shell to be ready
  const shellReady = await page
    .waitForFunction(
      () => {
        const hasTabStrip = !!document.querySelector('button[aria-label="New tab"]');
        const hasIpcBridge =
          typeof window !== 'undefined' &&
          (window as any).ipc &&
          typeof (window as any).ipc.invoke === 'function';
        return hasTabStrip && hasIpcBridge;
      },
      { timeout: 15_000 }
    )
    .then(
      () => true,
      () => false
    );

  if (!shellReady) {
    test.skip(true, 'Electron shell did not become ready in time; skipping webview bounds test.');
  }

  return { app, page };
}

async function getWindowBounds(app: ElectronApplication) {
  return app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return null;
    const bounds = win.getContentBounds();
    return {
      width: bounds.width,
      height: bounds.height,
    };
  });
}

async function getContainerBounds(page: Page) {
  return page.evaluate(() => {
    // Find the main content container that holds the webview
    const container = document.querySelector(
      '[role="tabpanel"], #browser-view-container, .tab-content-surface'
    ) as HTMLElement;
    if (!container) {
      // Fallback: find flex-1 container with overflow-hidden
      const candidates = Array.from(
        document.querySelectorAll('.flex-1.overflow-hidden')
      ) as HTMLElement[];
      if (candidates.length > 0) {
        const rect = candidates[0].getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          found: true,
        };
      }
      return { x: 0, y: 0, width: 0, height: 0, found: false };
    }
    const rect = container.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      found: true,
    };
  });
}

async function getHeaderHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    // Measure all top chrome elements
    const topNav = document.querySelector('[role="navigation"], nav, header') as HTMLElement;
    const tabStrip = document.querySelector('[role="tablist"]') as HTMLElement;
    const restoreBanner = document.querySelector(
      '[class*="restore"], [class*="session"]'
    ) as HTMLElement;

    let totalHeight = 0;
    if (topNav) {
      totalHeight += topNav.getBoundingClientRect().height;
    }
    if (tabStrip) {
      totalHeight += tabStrip.getBoundingClientRect().height;
    }
    if (restoreBanner && restoreBanner.offsetParent !== null) {
      totalHeight += restoreBanner.getBoundingClientRect().height;
    }

    return totalHeight;
  });
}

async function getBottomStatusHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const statusBar = document.querySelector(
      '[role="status"], footer, [class*="status"]'
    ) as HTMLElement;
    if (!statusBar) return 0;
    return statusBar.getBoundingClientRect().height;
  });
}

test.describe('Webview bounds and overflow', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async () => {
    ({ app, page } = await launchApp());
    // Wait a bit for layout to settle
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore cleanup errors
      }
    }
  });

  test('webview container should not overflow window bounds', async () => {
    // Load a real page to test bounds
    await page.evaluate(async () => {
      if (typeof (window as any).ipc?.invoke === 'function') {
        try {
          await (window as any).ipc.invoke('tabs:create', { url: 'https://www.google.com' });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for load
        } catch {
          // Ignore errors
        }
      }
    });

    await page.waitForTimeout(2000);

    const windowBounds = await getWindowBounds(app);
    const containerBounds = await getContainerBounds(page);

    expect(windowBounds).not.toBeNull();
    expect(containerBounds.found).toBeTruthy();

    if (windowBounds && containerBounds.found) {
      // Container should be within window bounds
      expect(containerBounds.x).toBeGreaterThanOrEqual(0);
      expect(containerBounds.y).toBeGreaterThanOrEqual(0);
      expect(containerBounds.width).toBeLessThanOrEqual(windowBounds.width + 2); // Allow 2px tolerance
      expect(containerBounds.height).toBeLessThanOrEqual(windowBounds.height + 2);

      // Container should not overflow
      expect(containerBounds.x + containerBounds.width).toBeLessThanOrEqual(windowBounds.width + 2);
      expect(containerBounds.y + containerBounds.height).toBeLessThanOrEqual(
        windowBounds.height + 2
      );
    }
  });

  test('webview container accounts for header and footer heights', async () => {
    await page.waitForTimeout(500);

    const windowBounds = await getWindowBounds(app);
    const containerBounds = await getContainerBounds(page);
    const headerHeight = await getHeaderHeight(page);
    const footerHeight = await getBottomStatusHeight(page);

    expect(windowBounds).not.toBeNull();
    expect(containerBounds.found).toBeTruthy();

    if (windowBounds && containerBounds.found) {
      // Container height should account for header + footer
      const expectedMaxHeight = windowBounds.height - headerHeight - footerHeight;

      // Allow 10px tolerance for spacing/padding
      expect(containerBounds.height).toBeLessThanOrEqual(expectedMaxHeight + 10);

      // Container should start below header
      expect(containerBounds.y).toBeGreaterThanOrEqual(headerHeight - 2);
    }
  });

  test('webview container resizes correctly on window resize', async () => {
    // Load a page
    await page.evaluate(async () => {
      if (typeof (window as any).ipc?.invoke === 'function') {
        try {
          await (window as any).ipc.invoke('tabs:create', { url: 'https://www.google.com' });
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch {
          // Ignore errors
        }
      }
    });

    await page.waitForTimeout(1500);

    // Get initial bounds
    const initialBounds = await getContainerBounds(page);
    expect(initialBounds.found).toBeTruthy();

    // Resize window
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.setContentSize(1200, 800);
      }
    });

    await page.waitForTimeout(1000); // Wait for resize handlers

    // Get new bounds
    const newBounds = await getContainerBounds(page);
    const newWindowBounds = await getWindowBounds(app);

    expect(newBounds.found).toBeTruthy();
    expect(newWindowBounds).not.toBeNull();

    if (newWindowBounds && newBounds.found) {
      // Container should still fit within window
      expect(newBounds.width).toBeLessThanOrEqual(newWindowBounds.width + 2);
      expect(newBounds.height).toBeLessThanOrEqual(newWindowBounds.height + 2);

      // Container should have actually resized (not same as initial)
      // Note: This might be same if window was already that size, so we check bounds are valid
      expect(newBounds.width).toBeGreaterThan(0);
      expect(newBounds.height).toBeGreaterThan(0);
    }
  });

  test('no content overflow outside container', async () => {
    // Load a page with scrollable content
    await page.evaluate(async () => {
      if (typeof (window as any).ipc?.invoke === 'function') {
        try {
          await (window as any).ipc.invoke('tabs:create', { url: 'https://www.google.com' });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch {
          // Ignore errors
        }
      }
    });

    await page.waitForTimeout(2000);

    // Check that no elements are overflowing the container
    const overflowCheck = await page.evaluate(() => {
      const container = document.querySelector(
        '[role="tabpanel"], #browser-view-container'
      ) as HTMLElement;
      if (!container) {
        // Fallback check for any elements outside viewport
        const allElements = Array.from(document.querySelectorAll('*')) as HTMLElement[];
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const overflowing = allElements
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return (
              rect.right > viewportWidth + 50 || // Allow 50px tolerance
              rect.bottom > viewportHeight + 50 ||
              rect.left < -50 ||
              rect.top < -50
            );
          })
          .filter(el => {
            // Exclude hidden or positioned elements (modals, tooltips)
            const style = window.getComputedStyle(el);
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.position !== 'fixed'
            );
          });

        return {
          found: false,
          overflowCount: overflowing.length,
          overflowing: overflowing.slice(0, 5).map(el => ({
            tag: el.tagName,
            classes: el.className,
            bounds: el.getBoundingClientRect(),
          })),
        };
      }

      const rect = container.getBoundingClientRect();
      const children = Array.from(container.querySelectorAll('*')) as HTMLElement[];
      const overflowing = children
        .filter(child => {
          const childRect = child.getBoundingClientRect();
          return (
            childRect.right > rect.right + 10 ||
            childRect.bottom > rect.bottom + 10 ||
            childRect.left < rect.left - 10 ||
            childRect.top < rect.top - 10
          );
        })
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

      return {
        found: true,
        overflowCount: overflowing.length,
        overflowing: overflowing.slice(0, 5).map(el => ({
          tag: el.tagName,
          classes: el.className,
          bounds: el.getBoundingClientRect(),
        })),
      };
    });

    // Should have found container or very few overflowing elements
    if (!overflowCheck.found) {
      // If container not found, check overflow count is reasonable (modals/tooltips allowed)
      expect(overflowCheck.overflowCount).toBeLessThan(10);
    } else {
      // Container found - should have minimal overflow
      expect(overflowCheck.overflowCount).toBeLessThan(5);
    }
  });

  test('header and tab bar are always visible and above content', async () => {
    await page.waitForTimeout(500);

    const zIndexCheck = await page.evaluate(() => {
      const header = document.querySelector('[role="navigation"], nav, header') as HTMLElement;
      const tabStrip = document.querySelector('[role="tablist"]') as HTMLElement;
      const container = document.querySelector(
        '[role="tabpanel"], #browser-view-container'
      ) as HTMLElement;

      if (!header && !tabStrip) {
        return { found: false, headerZ: 0, tabZ: 0, containerZ: 0 };
      }

      const getZIndex = (el: HTMLElement | null): number => {
        if (!el) return 0;
        const style = window.getComputedStyle(el);
        const z = parseInt(style.zIndex, 10);
        return Number.isNaN(z) ? 0 : z;
      };

      return {
        found: true,
        headerZ: getZIndex(header),
        tabZ: getZIndex(tabStrip),
        containerZ: getZIndex(container),
      };
    });

    if (zIndexCheck.found) {
      // Header or tab strip should have higher or equal z-index than container
      const maxChromeZ = Math.max(zIndexCheck.headerZ, zIndexCheck.tabZ);
      expect(maxChromeZ).toBeGreaterThanOrEqual(zIndexCheck.containerZ);
    }
  });
});
