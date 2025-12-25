import React from 'react';
import { Outlet } from 'react-router-dom';
import { OmniShell } from '../../ui/components/OmniShell';
import { DesktopIcons } from '../../ui/components/DesktopIcons';
import { useAppStore } from '../../state/appStore';
import { TradeModeLayout } from '../../modes/trade/TradeModeLayout';
import { OSBar } from '../ui/OSBar';
import { SignalRail } from '../ui/SignalRail';
import { ContextOverlay } from '../ui/ContextOverlay';
import { WhisperStrip } from '../ui/WhisperStrip';
import { useState } from 'react';
import { TopBar } from '../../ui/components/TopBar';
import { RegenResearchPanel } from '../../components/research/RegenResearchPanel';
import { AIDeveloperConsole } from '../../components/dev-console/AIDeveloperConsole';
import KnowledgePanel from '../../ui/components/KnowledgePanel';

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
      <div className="flex-1 h-full pb-12 flex flex-col" style={{background: '#0F1115'}}>
        {/* OS Authority Bar */}
        <OSBar />

        <div className="flex-1 flex h-[calc(100%-48px)]">
          {/* Signal rail */}
          <SignalRail />

          {/* Main workspace */}
          <main className="flex-1 h-full relative overflow-hidden">
            {mode === 'Browse' ? (
              <>
                <TopBar />
                <div className="h-full w-full os-desktop relative">
                <DesktopIcons />

                <div className="relative z-10 h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-2xl w-full">
                    <h1 className="text-4xl font-bold text-white mb-4">Omnibrowser OS</h1>
                    <p className="text-white/60 text-lg">Welcome to your AI-powered desktop environment</p>
                    <div className="mt-8 p-6 bg-white/6 rounded-2xl border border-white/6 max-w-md mx-auto">
                      <Outlet />
                      <div className="mt-4 flex justify-center">
                        <button className="px-3 py-1 rounded bg-[#4FD1C5] text-black" onClick={() => setShowOverlay(true)}>Summarize</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </> 
            ) : mode === 'Trade' ? (
              <TradeModeLayout />
            ) : mode === 'Research' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="p-4 h-full">
                  <RegenResearchPanel />
                </div>
              </div>
            ) : mode === 'Knowledge' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="p-4 h-full">
                  <KnowledgePanel />
                </div>
              </div>
            ) : mode === 'Dev' ? (
              <div className="h-full w-full">
                <TopBar />
                <div className="p-4 h-full">
                  <AIDeveloperConsole />
                </div>
              </div>
            ) : (
              <div className="p-4 h-full">
                <Outlet />
              </div>
            )}
          </main>
        </div>

        <WhisperStrip active={false} />

        {showOverlay && (
          <ContextOverlay title={overlayTitle} content={overlayContent} onDismiss={() => setShowOverlay(false)} />
        )}
      </div>
    </OmniShell>
  );
}

export default AppShell;

if (import.meta.hot) {
  import.meta.hot.accept();
}
