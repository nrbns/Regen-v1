/**
 * MainView - Browser webview container
 * BrowserView is managed by Electron main process, we show it here
 */

import { useEffect, useRef } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';

export function MainView() {
  const { activeId } = useTabsStore();
  const { mode } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // BrowserView is managed in main process, not directly in renderer
  // The actual webview is embedded by Electron's BrowserView API
  // This component just provides the container

  return (
    <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden w-full">
      {/* Browser Webview Container - Full Width */}
      <div className="absolute inset-0 w-full h-full" id="browser-view-container">
        {/* BrowserView is managed by Electron main process */}
        {/* This container is where it will be positioned */}
        {!activeId && (
          <div className="h-full w-full flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                OmniBrowser
              </h2>
              <p className="text-gray-500 text-sm">
                Enter a URL or search to get started
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

