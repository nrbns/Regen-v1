import React from 'react';
import { Outlet } from 'react-router-dom';
import { OmniShell } from '../../ui/components/OmniShell';
import { DesktopIcons } from '../../ui/components/DesktopIcons';
import { useAppStore } from '../../state/appStore';
import TradeLayout from '../../os/modes/Trade/TradeLayout';
import { OSBar } from '../ui/OSBar';
import StatusStrip from '../../components/ui/StatusStrip';
import SystemBar from '../../components/ui/SystemBar';
import CommandBar from '../../components/ui/CommandBar';
import AgentPanel from '../../components/ui/AgentPanel';
import { SignalRail } from '../ui/SignalRail';
import { ContextOverlay } from '../ui/ContextOverlay';
import { WhisperStrip } from '../ui/WhisperStrip';
import { useState } from 'react';
import { TopBar } from '../../ui/components/TopBar';
import { RegenResearchPanel } from '../../components/research/RegenResearchPanel';
import { AIDeveloperConsole } from '../../components/dev-console/AIDeveloperConsole';
import KnowledgePanel from '../../ui/components/KnowledgePanel';
import { ResourceMonitor } from '../resource/ResourceMonitor';

export function AppShell(): JSX.Element {
  const mode = useAppStore(s => s.mode);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState<string | undefined>(undefined);
  const [overlayContent, setOverlayContent] = useState<React.ReactNode | undefined>(undefined);
  // Show the TopBar for all primary modes to provide consistent chrome
  const showTopBar = true;

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev?.detail) {
        setOverlayTitle(ev.detail.title ?? 'Details');
        setOverlayContent(ev.detail.message ?? undefined);
        setShowOverlay(true);
      }
    };

    window.addEventListener('os:show-overlay', handler as EventListener);
    return () => window.removeEventListener('os:show-overlay', handler as EventListener);
  }, []);

  return (
    <OmniShell showTopBar={false} showTaskBar={false}>
      <div className="flex h-full flex-1 flex-col pb-12" style={{ background: '#0F1115' }}>
        {/* OS Authority Bar */}
        <OSBar />
        {/* Minimal status strip (read-only) */}
        <StatusStrip mode={mode} agent={"N/A"} health={"Stable"} />

        <div className="flex h-[calc(100%-48px)] flex-1">
          {/* Signal rail */}
          <SignalRail />

          {/* Main workspace */}
          <main className="relative h-full flex-1 overflow-hidden">
            {mode === 'Browse' ? (
              <>
                <TopBar />
                <div className="os-desktop relative h-full w-full">
                  <DesktopIcons />

                  <div className="relative z-10 flex h-full items-center justify-center p-8">
                    <div className="w-full max-w-2xl text-center">
                      <h1 className="mb-4 text-4xl font-bold text-white">Omnibrowser OS</h1>
                      <p className="text-lg text-white/60">
                        Welcome to your AI-powered desktop environment
                      </p>
                      <div className="bg-white/6 border-white/6 mx-auto mt-8 max-w-md rounded-2xl border p-6">
                        <Outlet />
                        <div className="mt-4 flex justify-center">
                          <button
                            className="rounded bg-[#4FD1C5] px-3 py-1 text-black"
                            onClick={() => setShowOverlay(true)}
                          >
                            Summarize
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : mode === 'Trade' ? (
              <TradeLayout />
            ) : mode === 'Research' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="h-full p-4">
                  <RegenResearchPanel />
                </div>
              </div>
            ) : mode === 'Knowledge' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="h-full p-4">
                  <KnowledgePanel />
                </div>
              </div>
            ) : mode === 'Dev' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="h-full p-4">
                  <AIDeveloperConsole />
                </div>
              </div>
            ) : (
              <div className="h-full p-4">
                <Outlet />
              </div>
            )}
          </main>
        </div>

        {/* Command input (emits raw text events only) */}
        <CommandBar onUserInput={text => window.dispatchEvent(new CustomEvent('ui:user-input', { detail: text }))} />

        {/* System metrics (read-only) */}
        <SystemBar ram="-" cpu="-" battery="-" redix="-" lastRepair="-" />

        <WhisperStrip active={false} />

        {/* Collapsed Agent Panel (read-only) */}
        <div style={{ position: 'fixed', right: 8, bottom: 72, width: 260 }}>
          <AgentPanel agents={[]} onStop={id => window.dispatchEvent(new CustomEvent('agent:stop', { detail: id }))} />
        </div>

        {showOverlay && (
          <ContextOverlay
            title={overlayTitle}
            content={overlayContent}
            onDismiss={() => setShowOverlay(false)}
          />
        )}

        <ResourceMonitor />
      </div>
    </OmniShell>
  );
}

export default AppShell;

if (import.meta.hot) {
  import.meta.hot.accept();
}
