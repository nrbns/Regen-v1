import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Target,
  Shield,
  Save,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from 'lucide-react';
import type { RiskMetrics } from './TradeDashboard';

const DEFAULT_SETTINGS = {
  riskPerTradePercent: 2,
  stopLossAtr: 1.5,
  takeProfitRatio: 2,
  direction: 'long' as 'long' | 'short',
};

const SETTINGS_STORAGE_KEY = 'trade-risk-manager-settings-v1';

export type RiskPlanSummary = {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPerTrade: number;
  riskPercent: number;
  positionSize: number;
  riskReward: number;
};

type RiskManagerProps = {
  symbol: string;
  currentPrice: number;
  atr: number;
  portfolioValue: number;
  balance: { cash: number; buyingPower: number; portfolioValue: number };
  riskMetrics: RiskMetrics;
  openPositions: Array<{ symbol: string; unrealizedPnL: number }>;
  onApplyPlan?: (plan: RiskPlanSummary) => void;
};

export default function RiskManager({
  symbol,
  currentPrice,
  atr,
  portfolioValue,
  balance,
  riskMetrics,
  openPositions,
  onApplyPlan,
}: RiskManagerProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lastAppliedPlan, setLastAppliedPlan] = useState<RiskPlanSummary | null>(null);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.warn('[RiskManager] Failed to load saved settings:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('[RiskManager] Failed to persist settings:', error);
    }
  }, [settings]);

  const plan = useMemo<RiskPlanSummary>(() => {
    const riskPercent = Math.max(0.1, settings.riskPerTradePercent);
    const riskPerTrade = Math.max(0, portfolioValue * (riskPercent / 100));
    const stopDistance = Math.max(0.01, atr * settings.stopLossAtr);
    const stopLoss =
      settings.direction === 'long'
        ? Math.max(0.01, currentPrice - stopDistance)
        : currentPrice + stopDistance;
    const rewardDistance = stopDistance * settings.takeProfitRatio;
    const takeProfit =
      settings.direction === 'long'
        ? currentPrice + rewardDistance
        : Math.max(0.01, currentPrice - rewardDistance);
    const riskPerShare = Math.max(0.01, Math.abs(currentPrice - stopLoss));
    const positionSize = Math.max(0, Math.floor(riskPerTrade / riskPerShare));
    const riskReward = riskPerShare > 0 ? Math.abs(takeProfit - currentPrice) / riskPerShare : 0;

    return {
      symbol,
      direction: settings.direction,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      riskPerTrade,
      riskPercent,
      positionSize,
      riskReward,
    };
  }, [settings, atr, currentPrice, portfolioValue, symbol]);

  const portfolioAllocation = useMemo(() => {
    if (!portfolioValue || plan.positionSize === 0) return 0;
    return Math.min(100, (plan.positionSize * currentPrice * 100) / portfolioValue);
  }, [plan.positionSize, currentPrice, portfolioValue]);

  const portfolioRiskUsage = useMemo(() => {
    if (!portfolioValue) return 0;
    return Math.min(100, (plan.riskPerTrade / portfolioValue) * 100);
  }, [plan.riskPerTrade, portfolioValue]);

  const exposurePercent = useMemo(() => {
    if (!portfolioValue) return 0;
    return Math.min(100, (riskMetrics.totalExposure / portfolioValue) * 100);
  }, [riskMetrics.totalExposure, portfolioValue]);

  const riskScore = useMemo(() => {
    const base = portfolioRiskUsage * 1.2 + exposurePercent * 0.5;
    const penalty = Math.max(
      0,
      Math.min(20, (Math.abs(riskMetrics.worstOpenTrade) / (portfolioValue || 1)) * 100)
    );
    return Math.round(Math.min(100, Math.max(5, base - penalty + openPositions.length * 1.5)));
  }, [
    portfolioRiskUsage,
    exposurePercent,
    riskMetrics.worstOpenTrade,
    portfolioValue,
    openPositions.length,
  ]);

  const handleApplyPlan = () => {
    if (!plan.positionSize || !onApplyPlan) return;
    onApplyPlan(plan);
    setLastAppliedPlan(plan);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setLastAppliedPlan(null);
  };

  const worstPosition = openPositions.reduce(
    (worst, pos) => (pos.unrealizedPnL < worst.unrealizedPnL ? pos : worst),
    openPositions[0] || { symbol: '', unrealizedPnL: 0 }
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#090b12] p-4 text-white shadow-inner shadow-black/40 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Risk Manager
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity size={14} />
          Risk score
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200 font-semibold">
            {riskScore}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <SliderRow
          label="Risk per trade"
          value={`${plan.riskPercent.toFixed(2)}% • ${formatCurrency(plan.riskPerTrade)}`}
          min={0.25}
          max={5}
          step={0.25}
          current={settings.riskPerTradePercent}
          onChange={val => setSettings(prev => ({ ...prev, riskPerTradePercent: val }))}
        />
        <SliderRow
          label="Stop distance (ATR)"
          value={`${settings.stopLossAtr.toFixed(1)} × ATR`}
          min={0.5}
          max={5}
          step={0.1}
          current={settings.stopLossAtr}
          onChange={val => setSettings(prev => ({ ...prev, stopLossAtr: val }))}
        />
        <SliderRow
          label="Take-profit ratio"
          value={`${settings.takeProfitRatio.toFixed(1)} × stop distance`}
          min={1}
          max={5}
          step={0.1}
          current={settings.takeProfitRatio}
          onChange={val => setSettings(prev => ({ ...prev, takeProfitRatio: val }))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
              setSettings(prev => ({ ...prev, direction: 'long' }));
            }}
            onMouseDown={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              settings.direction === 'long'
                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                : 'border-white/10 text-gray-300 hover:border-white/30'
            }`}
            style={{ zIndex: 10011, isolation: 'isolate' }}
          >
            <TrendingUp size={14} className="inline mr-2" />
            Long
          </button>
          <button
            type="button"
            onClick={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
              setSettings(prev => ({ ...prev, direction: 'short' }));
            }}
            onMouseDown={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              settings.direction === 'short'
                ? 'border-red-400 bg-red-500/10 text-red-100'
                : 'border-white/10 text-gray-300 hover:border-white/30'
            }`}
            style={{ zIndex: 10011, isolation: 'isolate' }}
          >
            <TrendingDown size={14} className="inline mr-2" />
            Short
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 md:grid-cols-2">
        <Stat label="Stop loss" value={`$${plan.stopLoss.toFixed(2)}`} sub="Risk distance" />
        <Stat label="Take profit" value={`$${plan.takeProfit.toFixed(2)}`} sub="Reward target" />
        <Stat
          label="Position size"
          value={`${plan.positionSize} shares`}
          sub={`${portfolioAllocation.toFixed(1)}% of portfolio`}
        />
        <Stat
          label="Risk / Reward"
          value={`${plan.riskReward.toFixed(2)}x`}
          sub={`${formatCurrency(plan.riskPerTrade)} risk • ${formatCurrency(plan.riskPerTrade * plan.riskReward)} reward`}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
        <PortfolioBar
          label="Risk allocation"
          value={portfolioRiskUsage}
          color="bg-emerald-500"
          description={`${plan.riskPercent.toFixed(2)}% of portfolio`}
        />
        <PortfolioBar
          label="Total exposure"
          value={exposurePercent}
          color="bg-indigo-500"
          description={`${openPositions.length} open positions`}
        />
        <PortfolioBar
          label="Buying power"
          value={
            balance.buyingPower
              ? Math.min(100, (balance.buyingPower / (portfolioValue || 1)) * 100)
              : 0
          }
          color="bg-cyan-500"
          description={`${formatCurrency(balance.buyingPower)} available`}
        />
      </div>

      {worstPosition.symbol && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-100 flex items-center justify-between">
          <div>
            <p className="font-semibold uppercase tracking-wide text-[11px]">Worst position</p>
            <p>
              {worstPosition.symbol} • ${worstPosition.unrealizedPnL.toFixed(2)} unrealized P/L
            </p>
          </div>
          <BarChart2 size={18} className="text-yellow-300" />
        </div>
      )}

      {lastAppliedPlan && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <p className="font-semibold uppercase tracking-wide text-[11px] mb-1">Plan applied</p>
          <p>
            {lastAppliedPlan.direction.toUpperCase()} {lastAppliedPlan.symbol} ·{' '}
            {lastAppliedPlan.positionSize} shares @ ${lastAppliedPlan.entryPrice.toFixed(2)}
          </p>
          <p>
            SL ${lastAppliedPlan.stopLoss.toFixed(2)} • TP ${lastAppliedPlan.takeProfit.toFixed(2)}{' '}
            • Risk {lastAppliedPlan.riskPercent.toFixed(2)}%
          </p>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button
          type="button"
          className="flex-1 rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={!plan.positionSize}
          onClick={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
            handleApplyPlan();
          }}
          onMouseDown={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
          }}
          style={{ zIndex: 10011, isolation: 'isolate' }}
        >
          <Target size={16} />
          Apply to order
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/20 px-3 py-2 text-xs text-gray-300 hover:border-white/40 hover:text-white flex items-center gap-2"
          onClick={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
            resetSettings();
          }}
          onMouseDown={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
          }}
          style={{ zIndex: 10011, isolation: 'isolate' }}
        >
          <RefreshCcw size={14} />
          Reset
        </button>
        <div className="text-[11px] text-gray-500 flex items-center gap-1">
          <Save size={12} />
          Auto-saved
        </div>
      </div>
    </div>
  );
}

type SliderRowProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
};

function SliderRow({ label, value, min, max, step, current, onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-semibold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={event => onChange(parseFloat(event.target.value))}
        className="w-full accent-emerald-400"
      />
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
  sub?: string;
};

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0f1a] p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

type PortfolioBarProps = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

function PortfolioBar({ label, value, color, description }: PortfolioBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-semibold">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {description && <p className="text-[11px] text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
