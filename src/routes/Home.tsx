import { useEffect, useState } from 'react';
import { useAppStore } from '../state/appStore';
import { ipcEvents } from '../lib/ipc-events';
import TradePanel from '../modes/trade';
import GamesPanel from '../modes/games';
import DocsPanel from '../modes/docs';
import ImagesPanel from '../modes/images';
import ThreatsPanel from '../modes/threats';
import GraphMindPanel from '../modes/graphmind';
import { MainView } from '../components/layout/MainView';
import { ResearchSplit } from '../components/Panels/ResearchSplit';
import { OmniDesk } from '../components/OmniDesk';
import { ResearchPane } from '../components/research/ResearchPane';

export default function Home() {
  const mode = useAppStore(s=>s.mode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreen = (data: { fullscreen: boolean }) => {
      setIsFullscreen(data.fullscreen);
    };
    
    // Use the IPC event bus
    const unsubscribe = ipcEvents.on<{ fullscreen: boolean }>('app:fullscreen-changed', handleFullscreen);
    
    return unsubscribe;
  }, []);
  
  return (
    <div className={`h-full w-full bg-[#1A1D28] flex flex-col ${isFullscreen ? 'absolute inset-0' : ''}`}>
      {(mode === 'Browse' || !mode || mode === 'Research') && (
        <div className="flex-1 w-full relative">
          <MainView />
          {/* Show OmniDesk when no tabs */}
          <OmniDesk />
          {/* Show Research panel overlay when in Research mode and not fullscreen */}
          {mode === 'Research' && !isFullscreen && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="pointer-events-auto h-full w-full">
                <ResearchSplit />
              </div>
            </div>
          )}
        </div>
      )}
      {mode === 'Trade' && <TradePanel />}
      {mode === 'Games' && <GamesPanel />}
      {mode === 'Docs' && <DocsPanel />}
      {mode === 'Images' && <ImagesPanel />}
      {mode === 'Threats' && <ThreatsPanel />}
      {mode === 'GraphMind' && <GraphMindPanel />}
      
      {/* Research Pane - Available in all modes */}
      {!isFullscreen && <ResearchPane />}
    </div>
  );
}


