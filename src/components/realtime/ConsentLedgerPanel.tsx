import { useEffect, useState } from 'react';
import { getSocketClient, initSocketClient } from '../../services/realtime/socketClient';

export function ConsentLedgerPanel() {
  const [ledger, setLedger] = useState<any[]>([]);

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
      unsub = client.on?.('consent:ledger:updated', (data: any) =>
        setLedger(prev => [data, ...prev])
      );
    })();
    return () => {
      unsub?.();
    };
  }, []);

  return (
    <div className="mt-4">
      <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Consent Ledger</h3>
      <div className="h-32 overflow-y-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">
        {ledger.length === 0 && <div className="text-slate-400">No consent entries yet.</div>}
        {ledger.map((entry, i) => (
          <div key={i} className="mb-1">
            <span className="text-blue-700 dark:text-blue-300">{entry.action}</span> by {entry.user}{' '}
            - {entry.decision ? 'Allowed' : 'Denied'}
          </div>
        ))}
      </div>
    </div>
  );
}
