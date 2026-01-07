import { SlidersHorizontal, Settings2 } from 'lucide-react';
import type { IndicatorConfig } from './TradingViewChart';

type IndicatorsProps = {
  indicators: IndicatorConfig[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<IndicatorConfig>) => void;
};

export default function Indicators({ indicators, onToggle, onUpdate }: IndicatorsProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b12] p-4 text-white shadow-inner shadow-black/40 space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-indigo-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Indicators
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <Settings2 size={13} />
          Configure overlays & oscillators
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map(indicator => (
          <div
            key={indicator.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 shadow-inner shadow-black/30 transition hover:border-white/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {indicator.label}{' '}
                  <span className="text-[11px] uppercase text-gray-500">
                    ({indicator.type.toUpperCase()})
                  </span>
                </p>
                <p className="text-[11px] text-gray-400">
                  {indicator.type === 'sma' || indicator.type === 'ema'
                    ? `Period ${indicator.period}`
                    : indicator.type === 'rsi'
                      ? `Period ${indicator.period} • Bands ${indicator.lowerBand ?? 30}/${indicator.upperBand ?? 70}`
                      : `Fast ${indicator.fastPeriod} • Slow ${indicator.slowPeriod} • Signal ${indicator.signalPeriod}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(indicator.id)}
                className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  indicator.enabled
                    ? 'bg-emerald-500/80 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {indicator.enabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className="mt-3 grid gap-3 text-xs text-gray-300 sm:grid-cols-2">
              {(indicator.type === 'sma' || indicator.type === 'ema') && (
                <>
                  <label className="space-y-1">
                    <span>Period</span>
                    <input
                      type="number"
                      min={2}
                      max={500}
                      value={indicator.period}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          period: clampNumber(Number(event.target.value), 2, 500),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Color</span>
                    <input
                      type="color"
                      value={indicator.color}
                      onChange={event => onUpdate(indicator.id, { color: event.target.value })}
                      className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-1"
                    />
                  </label>
                </>
              )}

              {indicator.type === 'rsi' && (
                <>
                  <label className="space-y-1">
                    <span>Period</span>
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={indicator.period}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          period: clampNumber(Number(event.target.value), 2, 200),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Upper Band</span>
                    <input
                      type="number"
                      min={40}
                      max={90}
                      value={indicator.upperBand ?? 70}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          upperBand: clampNumber(Number(event.target.value), 40, 90),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Lower Band</span>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={indicator.lowerBand ?? 30}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          lowerBand: clampNumber(Number(event.target.value), 10, 60),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Color</span>
                    <input
                      type="color"
                      value={indicator.color}
                      onChange={event => onUpdate(indicator.id, { color: event.target.value })}
                      className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-1"
                    />
                  </label>
                </>
              )}

              {indicator.type === 'macd' && (
                <>
                  <label className="space-y-1">
                    <span>Fast Period</span>
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={indicator.fastPeriod}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          fastPeriod: clampNumber(Number(event.target.value), 2, 200),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Slow Period</span>
                    <input
                      type="number"
                      min={indicator.fastPeriod + 1}
                      max={400}
                      value={indicator.slowPeriod}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          slowPeriod: clampNumber(
                            Number(event.target.value),
                            indicator.fastPeriod + 1,
                            400
                          ),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Signal Period</span>
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={indicator.signalPeriod}
                      onChange={event =>
                        onUpdate(indicator.id, {
                          signalPeriod: clampNumber(Number(event.target.value), 2, 200),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>MACD Color</span>
                    <input
                      type="color"
                      value={indicator.color}
                      onChange={event => onUpdate(indicator.id, { color: event.target.value })}
                      className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-1"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Signal Color</span>
                    <input
                      type="color"
                      value={indicator.signalColor}
                      onChange={event =>
                        onUpdate(indicator.id, { signalColor: event.target.value })
                      }
                      className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-1"
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Histogram Color</span>
                    <input
                      type="color"
                      value={indicator.histogramColor}
                      onChange={event =>
                        onUpdate(indicator.id, { histogramColor: event.target.value })
                      }
                      className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 p-1"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
