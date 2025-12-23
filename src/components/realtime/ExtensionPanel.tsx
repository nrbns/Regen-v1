import { useEffect, useState } from 'react';
import { getSocketClient, initSocketClient } from '../../services/realtime/socketClient';

export function ExtensionPanel() {
  const [extensions, setExtensions] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    let client: any;
    let unsubLoaded: any, unsubError: any;
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
      unsubLoaded = client.on?.('extension:loaded', (data: any) =>
        setExtensions(prev => [data, ...prev])
      );
      unsubError = client.on?.('extension:error', (data: any) =>
        setErrors(prev => [data, ...prev])
      );
    })();
    return () => {
      unsubLoaded?.();
      unsubError?.();
    };
  }, []);

  return (
    <div className="mt-4">
      <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-200">Extensions</h3>
      <div className="h-32 overflow-y-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-800">
        {extensions.length === 0 && <div className="text-slate-400">No extensions loaded.</div>}
        {extensions.map((ext, i) => (
          <div key={i} className="mb-1">
            <span className="text-blue-700 dark:text-blue-300">{ext.name}</span>
          </div>
        ))}
      </div>
      {errors.length > 0 && (
        <div className="mt-2 text-xs text-red-500">
          <div>Extension Errors:</div>
          {errors.map((err, i) => (
            <div key={i}>
              {err.name}: {String(err.error)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
