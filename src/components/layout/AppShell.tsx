/**
 * AppShell - Main layout container with all components wired
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { TabStrip } from './TabStrip';
import { RightPanel } from './RightPanel';
import { BottomStatus } from './BottomStatus';
import { CommandPalette } from './CommandPalette';
import { PermissionPrompt } from '../Overlays/PermissionPrompt';
import { ConsentPrompt } from '../Overlays/ConsentPrompt';
import { PermissionRequest, ConsentRequest, ipcEvents } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for permission requests
  useIPCEvent<PermissionRequest>('permissions:request', (request) => {
    setPermissionRequest(request);
  }, []);

  // Listen for consent requests
  useIPCEvent<ConsentRequest>('agent:consent:request', (request) => {
    setConsentRequest(request);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreen = (data: { fullscreen: boolean }) => {
      setIsFullscreen(data.fullscreen);
    };
    
    // Use the IPC event bus
    const unsubscribe = ipcEvents.on<{ fullscreen: boolean }>('app:fullscreen-changed', handleFullscreen);
    
    return unsubscribe;
  }, []);

  // Global keyboard shortcuts (Windows/Linux: Ctrl, macOS: Cmd)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // ⌘K / Ctrl+K: Command Palette
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ⌘L / Ctrl+L: Focus URL bar (handled in Omnibox, but ensure it works)
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        // Let Omnibox handle this, but don't prevent default if it's already handled
        return;
      }

      // ⌘T / Ctrl+T: New Tab
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        ipc.tabs.create('about:blank').catch(console.error);
        return;
      }

      // ⌘W / Ctrl+W: Close Tab
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const state = useTabsStore.getState();
        if (state.activeId) {
          ipc.tabs.close({ id: state.activeId }).catch(console.error);
        }
        return;
      }

      // ⌘⇧T / Ctrl+Shift+T: Reopen Closed Tab
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        // Would reopen last closed tab - need to implement closed tab history
        return;
      }

      // ⌘⇧A / Ctrl+Shift+A: Toggle Agent Console
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
        return;
      }

      // ⌥⌘P / Alt+Ctrl+P: Proxy Menu (opens NetworkButton menu)
      if (modifier && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        // Trigger NetworkButton click via data attribute
        const networkButton = document.querySelector('[data-network-button]') as HTMLElement;
        networkButton?.click();
        return;
      }

      // ⌥⌘S / Alt+Ctrl+S: Shields Menu (opens ShieldsButton menu)
      if (modifier && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Trigger ShieldsButton click via data attribute
        const shieldsButton = document.querySelector('[data-shields-button]') as HTMLElement;
        shieldsButton?.click();
        return;
      }

      // ⌘F / Ctrl+F: Find in Page (handled by browser)
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        return;
      }

      // Alt+← / ⌘←: Go back (handled by TopNav)
      // Alt+→ / ⌘→: Go forward (handled by TopNav)
      // Ctrl+R / ⌘R: Refresh (handled by TopNav)

      // Esc: Close modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (permissionRequest) {
          setPermissionRequest(null);
        } else if (consentRequest) {
          setConsentRequest(null);
        } else if (rightPanelOpen) {
          setRightPanelOpen(false);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, permissionRequest, consentRequest, rightPanelOpen]);

  return (
    <div className="flex flex-col h-screen bg-[#1A1D28] text-gray-100 overflow-hidden relative">
      {/* Top Navigation - Hidden in fullscreen */}
      {!isFullscreen && (
        <TopNav 
          onAgentToggle={() => setRightPanelOpen(!rightPanelOpen)}
          onCommandPalette={() => setCommandPaletteOpen(true)}
        />
      )}

      {/* Main Layout - Full Width (No Sidebar) */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Center Content - Full Width */}
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          {/* Tab Strip - Hidden in fullscreen */}
          {!isFullscreen && <TabStrip />}

          {/* Route Content - Full Width */}
          <div className={`flex-1 overflow-hidden relative w-full ${isFullscreen ? 'absolute inset-0' : ''}`}>
            <Outlet />
          </div>
        </div>

        {/* Right Panel (Agent Console) - Hidden in fullscreen */}
        {!isFullscreen && (
          <RightPanel 
            open={rightPanelOpen}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      {/* Bottom Status Bar - Hidden in fullscreen */}
      {!isFullscreen && <BottomStatus />}

      {/* Overlays */}
      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}

      {permissionRequest && (
        <PermissionPrompt 
          request={permissionRequest}
          onClose={() => setPermissionRequest(null)}
        />
      )}

      {consentRequest && (
        <ConsentPrompt 
          request={consentRequest}
          onClose={() => setConsentRequest(null)}
        />
      )}
    </div>
  );
}
