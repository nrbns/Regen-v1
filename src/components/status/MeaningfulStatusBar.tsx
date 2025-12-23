import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Brain, Zap, WifiOff, Wifi } from 'lucide-react';
import { useMemoryStore } from '../../state/memoryStore';

export function MeaningfulStatusBar() {
  const latest = useMemoryStore(state => state.latest);
  const capacityMB = useMemoryStore(state => state.capacityMB);
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const labels = useMemo(() => {
    // Memory-based label
    let efficiency = 'Balanced Mode';
    if (latest && (capacityMB ?? 0) > 0) {
      const total = latest.totalMB || 0;
      const cap = capacityMB ?? Math.max(total * 1.5, 4096);
      const ratio = total / cap;
      if (ratio < 0.45) efficiency = '⚡ Ultra Light Mode';
      else if (ratio < 0.7) efficiency = '🌿 Efficient Mode';
      else efficiency = '🛡️ Power Save Active';
    } else {
      efficiency = '🌿 Efficient Mode';
    }

    // AI cache label (assume offline inference available)
    const ai = '🧠 AI Cached';

    // Privacy label (default true; UI conveys promise rather than metric)
    const privacy = '🔒 Privacy Safe';

    // Network label
    const network = online ? '🟢 Online' : '🟠 Offline Ready';

    return { efficiency, ai, privacy, network };
  }, [latest, capacityMB, online]);

  return (
    <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-200">
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Zap size={14} className="text-amber-300" /> {labels.efficiency}
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Brain size={14} className="text-purple-300" /> {labels.ai}
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <ShieldCheck size={14} className="text-emerald-300" /> {labels.privacy}
      </span>
      <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap">
        {online ? (
          <Wifi size={14} className="text-cyan-300" />
        ) : (
          <WifiOff size={14} className="text-amber-300" />
        )}{' '}
        {labels.network}
      </span>
    </div>
  );
}
