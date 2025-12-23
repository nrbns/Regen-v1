import { useEffect, useState } from 'react';
import { getSocketClient, initSocketClient } from '../../services/realtime/socketClient';

export function CrashRecoveryPanel() {
  const [crashes, setCrashes] = useState<any[]>([]);

  useEffect(() => {
    let client: any;
    let unsub: any;
    (async () => {
      try {
        client = getSocketClient();
      } catch {
        const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:4000';
        client = await initSocketClient({
          url: socketUrl,
          token: null,
          deviceId: `web-${Date.now()}`,
        });
      }
      if (!client) return;
      unsub = client.on?.('crash:detected', (data: any) => setCrashes(prev => [data, ...prev]));
    })();
    return () => {
      unsub?.();
    };
  }, []);

  return (
    <div className="mt-4">
      <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Crash Recovery</h3>
      <div className="h-32 overflow-y-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">
        {crashes.length === 0 && <div className="text-slate-400">No crashes detected.</div>}
        {crashes.map((crash, i) => (
          <div key={i} className="mb-1">
            <span className="text-red-700 dark:text-red-300">{crash.type}</span> at{' '}
            {new Date(crash.timestamp).toLocaleString()}
            <br />
            <span className="text-slate-500">{String(crash.error).slice(0, 120)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
