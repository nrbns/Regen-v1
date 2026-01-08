// Home component - renders the main browser interface
// This shows the browser when no specific route is active

import React, { useState, useEffect } from 'react';
import { TabsBar } from '../ui/components/TabsBar';
import { WebView } from '../ui/components/WebView';
import { CommandBar } from '../components/CommandBar';
import { RealityStrip } from '../ui/components/RealityStrip';
import { systemState } from '../backend';

export default function Home() {
  const [activeTab, setActiveTab] = useState(systemState.getActiveTab());

  useEffect(() => {
    const handleStateChange = () => {
      setActiveTab(systemState.getActiveTab());
    };

    systemState.on('state-changed', handleStateChange);
    return () => systemState.off('state-changed', handleStateChange);
  }, []);

  const handleCommandSubmit = (intent: any) => {
    console.log('Command submitted:', intent);
    // Handle navigation and AI commands
  };

  const handleUrlChange = (url: string) => {
    if (activeTab) {
      systemState.updateTab(activeTab.id, { url });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 text-white overflow-hidden">
      {/* Command Orbit */}
      <CommandBar onSubmit={handleCommandSubmit} />

      {/* Tabs Bar */}
      <div className="pt-16">
        <TabsBar />
      </div>

      {/* Web Content */}
      <div className="flex-1">
        <WebView
          url={activeTab?.url}
          onUrlChange={handleUrlChange}
        />
      </div>

      {/* Reality Strip */}
      <RealityStrip
        metrics={{
          cpu: 25,
          ram: 45,
          network: true,
          activeModel: 'local'
        }}
      />
    </div>
  );
}
