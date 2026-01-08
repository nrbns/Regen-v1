import React, { useState, useEffect } from 'react';
import { TabsBar } from '../../ui/components/TabsBar';
import { AddressBar } from '../../ui/components/AddressBar';
import { WebView } from '../../ui/components/WebView';
import { StatusStrip } from '../../ui/components/StatusStrip';
import { Diagnostics } from '../../ui/components/Diagnostics';
import { systemState, IPCHandler, IPC_EVENTS } from '../../backend';

export function AppShell(): JSX.Element {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [systemStateData, setSystemStateData] = useState(systemState.getState());

  // Subscribe to system state changes
  useEffect(() => {
    const handleStateChange = (newState: any) => {
      setSystemStateData(newState);
    };

    systemState.on('state-changed', handleStateChange);

    // Initialize with one tab if none exist
    if (systemStateData.tabs.length === 0) {
      IPCHandler.newTab();
    }

    return () => {
      systemState.off('state-changed', handleStateChange);
    };
  }, []);

  const activeTab = systemStateData.tabs.find(tab => tab.id === systemStateData.activeTabId);

  // Handle navigation from address bar - UI only sends events
  const handleNavigate = (url: string) => {
    if (systemStateData.activeTabId) {
      IPCHandler.navigate(systemStateData.activeTabId, url);
    }
  };

  // Handle URL changes from iframe - UI only sends events
  const handleUrlChange = (url: string) => {
    if (systemStateData.activeTabId) {
      // In a real implementation, this would be handled by the WebView's navigation events
      // For now, just update the state
      systemState.updateTab(systemStateData.activeTabId, { url, title: url });
    }
  };

  // Keyboard shortcut for diagnostics (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDiagnostics(true);
      }
      if (e.key === 'Escape' && showDiagnostics) {
        setShowDiagnostics(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiagnostics]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      {/* Tabs Bar */}
      <TabsBar />

      {/* Address Bar */}
      <AddressBar
        onNavigate={handleNavigate}
        currentUrl={activeTab?.url}
      />

      {/* Web Content Area */}
      <WebView
        url={activeTab?.url}
        onUrlChange={handleUrlChange}
      />

      {/* Status Strip */}
      <StatusStrip status={systemStateData.status} />

      {/* Diagnostics (hidden by default, Ctrl+Shift+D to show) */}
      <Diagnostics
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </div>
  );
}

export default AppShell;

if (import.meta.hot) {
  import.meta.hot.accept();
}
