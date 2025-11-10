import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BatteryCharging, BatteryFull, Cloud, CloudLightning, Leaf, Loader2, RefreshCw, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { useEcoImpactStore } from '../../state/ecoImpactStore';
import type { EcoImpactRecommendation } from '../../types/ecoImpact';

const horizons = [60, 120, 180];

function formatMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) {
    return '—';
  }
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

function Recommendation({ item }: { item: EcoImpactRecommendation }) {
  const impactTone = {
    low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    medium: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    high: 'border-red-500/40 bg-red-500/10 text-red-200',
  }[item.impact];

  return (
    <motion.div
      layout
      className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-3 shadow-inner shadow-black/30"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-200">{item.title}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${impactTone}`}>{item.impact.toUpperCase()}</span>
      </div>
      <p className="mt-2 text-xs text-gray-400 leading-relaxed">{item.description}</p>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">{item.category} impact</div>
    </motion.div>
  );
}

export function EcoImpactSimulator() {
  const { forecast, loading, error, horizonMinutes, setHorizon, fetch } = useEcoImpactStore();

  useEffect(() => {
    if (!forecast && !loading) {
      void fetch();
    }
  }, [forecast, loading, fetch]);

  const refresh = () => {
    void fetch();
  };

  const batterySlope = forecast?.battery.slopePerHour ?? null;
  const carbonTrend = forecast?.carbon.trend ?? 'unknown';
  const carbonSamples = forecast?.carbon.samples ?? [];
  const carbonIntensities = carbonSamples.map((sample) => sample.intensity);
  const carbonMin = carbonIntensities.length > 0 ? Math.min(...carbonIntensities) : null;
  const carbonMax = carbonIntensities.length > 0 ? Math.max(...carbonIntensities) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Leaf size={16} className="text-emerald-400" />
            Eco-Impact Simulator
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            Forecast battery life and grid carbon intensity to plan energy-aware workflows.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20"
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span>Forecast horizon:</span>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/70 px-2 py-1">
          {horizons.map((minutes) => (
            <button
              key={minutes}
              onClick={() => setHorizon(minutes)}
              className={`px-2 py-1 rounded transition-colors text-xs ${
                horizonMinutes === minutes
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {minutes / 60 >= 1 ? `${minutes / 60}h` : `${minutes}m`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <AnimatePresence>
        {forecast && !error && (
          <motion.div
            key={forecast.generatedAt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Summary</div>
                  <p className="mt-2 text-sm text-gray-200 leading-relaxed">
                    {forecast.summary || 'Awaiting telemetry sample...'}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500">
                  Updated {new Date(forecast.generatedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-200 text-sm font-semibold">
                    {forecast.battery.charging ? <BatteryCharging size={16} className="text-emerald-400" /> : <BatteryFull size={16} className="text-amber-300" />}
                    Battery trajectory
                  </div>
                  <span className="text-[11px] text-slate-500">Slope {batterySlope !== null ? `${batterySlope > 0 ? '+' : ''}${batterySlope.toFixed(1)}%/h` : '—'}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-3xl font-semibold text-gray-100">
                    {forecast.battery.currentPct !== null ? `${Math.round(forecast.battery.currentPct)}%` : '—'}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <Timer size={12} />
                      <span>
                        {forecast.battery.charging
                          ? `≈${formatMinutes(forecast.battery.minutesToFull)} to full`
                          : `≈${formatMinutes(forecast.battery.minutesToEmpty)} to empty`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CloudLightning size={12} />
                      <span>{forecast.battery.charging ? 'Charging via grid' : 'Running on battery'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">Projected milestones</div>
                  {forecast.battery.projections.length === 0 ? (
                    <div className="text-xs text-slate-500">Need more telemetry samples to forecast milestones.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {forecast.battery.projections.map((projection) => (
                        <div
                          key={projection.level}
                          className="rounded-lg border border-slate-800/60 bg-slate-900/80 px-3 py-2 text-xs text-gray-300 flex items-center justify-between"
                        >
                          <span>{projection.label}</span>
                          <span className="text-slate-400">{formatMinutes(projection.minutes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-200 text-sm font-semibold">
                    <Cloud size={16} className="text-sky-300" />
                    Carbon outlook
                  </div>
                  <span className="text-[11px] text-slate-500 capitalize">{carbonTrend}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-3xl font-semibold text-gray-100">
                    {forecast.carbon.currentIntensity !== null ? `${Math.round(forecast.carbon.currentIntensity)} g` : '—'}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      {carbonTrend === 'rising' ? <TrendingUp size={12} className="text-amber-300" /> : carbonTrend === 'falling' ? <TrendingDown size={12} className="text-emerald-300" /> : <Cloud size={12} />}
                      <span>
                        Forecast {forecast.carbon.forecastIntensity !== null ? `${Math.round(forecast.carbon.forecastIntensity)} g` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Leaf size={12} className="text-emerald-300" />
                      <span>Confidence {(forecast.carbon.confidence * 100).toFixed(0)}%</span>
                    </div>
                    {forecast.carbon.region && (
                      <div className="flex items-center gap-2">
                        <Cloud size={12} />
                        <span>Region {forecast.carbon.region}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">Recent intensity</div>
                  <div className="relative h-16 w-full overflow-hidden rounded-lg border border-slate-800/60 bg-slate-900/80">
                    {carbonSamples.length > 1 && carbonMin !== null && carbonMax !== null ? (
                      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-80 text-sky-400">
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          points={carbonSamples
                            .map((sample, index) => {
                              const x = (index / Math.max(1, carbonSamples.length - 1)) * 100;
                              const range = carbonMax - carbonMin || 1;
                              const normalized = 100 - ((sample.intensity - carbonMin) / range) * 80 - 10;
                              return `${x.toFixed(2)},${normalized.toFixed(2)}`;
                            })
                            .join(' ')}
                        />
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
                        Insufficient data for sparkline
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
                <Leaf size={12} className="text-emerald-300" />
                Recommended moves
              </div>
              <div className="grid grid-cols-1 gap-3">
                {forecast.recommendations.map((item) => (
                  <Recommendation key={item.id} item={item} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!forecast && !error && loading && (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          <Loader2 size={18} className="mr-2 animate-spin" />
          Waiting for telemetry samples…
        </div>
      )}
    </div>
  );
}
