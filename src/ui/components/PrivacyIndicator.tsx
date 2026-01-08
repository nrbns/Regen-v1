import React, { useState, useEffect } from 'react';
import { ShieldCheck, WifiOff, Wifi } from 'lucide-react';
import { useSystemStatus } from '../../hooks/useSystemStatus';

export function PrivacyIndicator() {
  const { data: status } = useSystemStatus();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // For v1 we present a minimal, honest indicator and avoid VPN UI
  const label = 'PRIVACY: Local-only | Network: On-demand';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(s => !s)}
        title="Privacy status"
        aria-label="Privacy status"
        className="flex items-center gap-2 rounded bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
      >
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span className="font-medium">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 text-sm shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck />
            <strong>Privacy</strong>
          </div>
          <p className="mt-2 text-[var(--text-muted)]">
            Regen runs locally by default. Network features activate only when requested.
          </p>
          <div className="mt-3 text-xs text-[var(--text-muted)]">v1 decisions:</div>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Local-first processing by default.</li>
            <li>Network calls only on explicit user action.</li>
            <li>Whispr (voice) is manual and off by default.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default PrivacyIndicator;
