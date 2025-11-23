import { useState, useMemo } from 'react';
import { Battery, BatteryCharging, Zap } from 'lucide-react';
import { usePowerStore, PowerMode } from '../../state/powerStore';
import { PowerModeSelector } from './PowerModeSelector';
import { setPowerMode } from '../../core/redix/power-modes';

function formatPercent(level: number | null): string {
  if (typeof level !== 'number') return '—';
  return `${Math.round(level * 100)}%`;
}

export function BatteryIndicator() {
  const battery = usePowerStore(state => state.battery);
  const selectedMode = usePowerStore(state => state.selectedMode);
  const effectiveMode = usePowerStore(state => state.effectiveMode);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const icon = useMemo(() => {
    if (battery.charging) {
      return <BatteryCharging size={18} className="text-emerald-300" />;
    }
    return <Battery size={18} className="text-slate-200" />;
  }, [battery.charging]);

  const levelLabel = formatPercent(battery.level);
  const autoActive = selectedMode === 'Auto';

  const modeLabel = autoActive ? `Auto → ${effectiveMode}` : effectiveMode;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-left text-sm text-white shadow-lg shadow-black/40 backdrop-blur transition hover:border-white/30"
        >
          <div className="flex items-center gap-2">
            {icon}
            <div className="flex flex-col leading-tight">
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Battery</span>
              <span className="text-sm font-semibold text-white">{levelLabel}</span>
            </div>
          </div>
          <div className="flex flex-col text-right leading-tight">
            <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Mode</span>
            <span className="text-sm font-semibold text-white">{modeLabel}</span>
          </div>
          <div className="rounded-full bg-purple-500/20 p-1.5 text-purple-200">
            <Zap size={14} />
          </div>
        </button>
        {!battery.supported && (
          <span className="text-xs text-slate-400">Battery telemetry unavailable</span>
        )}
      </div>
      {selectorOpen && (
        <PowerModeSelector
          selected={selectedMode}
          effective={effectiveMode}
          onClose={() => setSelectorOpen(false)}
          onSelect={(mode: PowerMode) => {
            setPowerMode(mode);
            setSelectorOpen(false);
          }}
        />
      )}
    </>
  );
}
