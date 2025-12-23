import { useEffect, useState, useRef } from 'react';
import { eventBus } from '../../core/state/eventBus';
import { GlobalAIStatusBar } from './GlobalAIStatusBar';
import { JobTimelinePanel } from './JobTimelinePanel';
import {
  getSocketClient as _getSocketClient,
  initSocketClient as _initSocketClient,
} from '../../services/realtime/socketClient';
import { ExtensionPanel } from './ExtensionPanel';
import { ConsentLedgerPanel } from './ConsentLedgerPanel';
import { CrashRecoveryPanel } from './CrashRecoveryPanel';

// Advanced System Console Overlay: Aggregates all real-time system state
export function SystemConsoleOverlay() {
  const [show, setShow] = useState(false);
  const logsRef = useRef<any[]>([]);
  const skillsRef = useRef<any[]>([]);
  const usersRef = useRef<any[]>([]);
  const sessionsRef = useRef<any[]>([]);
  const [, forceUpdate] = useState(0); // force re-render

  useEffect(() => {
    // Hydrate from eventBus
    const handleLog = (data: any) => {
      logsRef.current = [data, ...logsRef.current.slice(0, 199)];
      forceUpdate(x => x + 1);
    };
    const handleSkill = (data: any) => {
      skillsRef.current = [data, ...skillsRef.current];
      forceUpdate(x => x + 1);
    };
    const handleUser = (data: any) => {
      usersRef.current = [data, ...usersRef.current];
      forceUpdate(x => x + 1);
    };
    const handleSession = (data: any) => {
      sessionsRef.current = [data, ...sessionsRef.current];
      forceUpdate(x => x + 1);
    };
    const offLog = eventBus.on('runtime:event', handleLog);
    const offSkill = eventBus.on('skill:loaded', handleSkill);
    const offUser = eventBus.on('user:registered', handleUser);
    const offSession = eventBus.on('session:created', handleSession);
    return () => {
      offLog();
      offSkill();
      offUser();
      offSession();
    };
  }, []);

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700"
        onClick={() => setShow(s => !s)}
        title="Open System Console"
      >
        <span className="font-bold">Ω</span>
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30">
          <div className="m-8 w-full max-w-2xl rounded-lg bg-white/95 p-4 shadow-2xl dark:bg-slate-900/95">
            <div className="mb-2 flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-bold">System Console</h2>
              <button
                className="text-slate-500 hover:text-slate-900"
                onClick={() => setShow(false)}
              >
                &times;
              </button>
            </div>
            <GlobalAIStatusBar />
            <JobTimelinePanel />
            <div className="mt-4">
              <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
                Recent Events
              </h3>
              <div className="h-32 overflow-y-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">
                {logsRef.current.slice(0, 30).map((log, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-slate-400">[{log.timestamp}]</span>{' '}
                    <span className="text-blue-700 dark:text-blue-300">{log.event}</span>{' '}
                    <span className="text-slate-600 dark:text-slate-200">
                      {JSON.stringify(log.payload)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <ExtensionPanel />
                <ConsentLedgerPanel />
                <CrashRecoveryPanel />
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
                  Users/Sessions
                </h4>
                <div className="h-20 overflow-y-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                  {usersRef.current.slice(0, 10).map((u, i) => (
                    <div key={i}>
                      {u.userId} <span className="text-slate-400">{JSON.stringify(u.profile)}</span>
                    </div>
                  ))}
                  {sessionsRef.current.slice(0, 10).map((s, i) => (
                    <div key={i}>
                      {s.userId} <span className="text-slate-400">{s.sessionId}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SystemConsoleOverlay;
