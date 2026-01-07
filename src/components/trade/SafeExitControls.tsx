import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Power, XCircle, TrendingDown } from 'lucide-react';

export interface SafeExitConfig {
  maxDrawdown: number;
  portfolioStopLoss: number;
  volatilityThreshold: number;
  globalKillSwitch: boolean;
}

interface SafeExitControlsProps {
  config: SafeExitConfig;
  onConfigChange: (config: SafeExitConfig) => void;
  onKillSwitch: (enabled: boolean) => void;
  onCloseAll: () => void;
  onClosePosition: (symbol: string) => void;
  openPositions: Array<{ symbol: string; unrealizedPnL: number }>;
}

export default function SafeExitControls({
  config,
  onConfigChange,
  onKillSwitch,
  onCloseAll,
  onClosePosition,
  openPositions,
}: SafeExitControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const worstPosition = openPositions.reduce(
    (worst, pos) => (pos.unrealizedPnL < worst.unrealizedPnL ? pos : worst),
    openPositions[0] || { symbol: '', unrealizedPnL: 0 }
  );

  return (
    <div className="space-y-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-yellow-400" />
          <h3 className="text-sm font-semibold">Safe Exit Controls</h3>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          {showAdvanced ? 'Hide' : 'Advanced'}
        </button>
      </div>

      {/* Global Kill Switch */}
      <div className="rounded border border-neutral-700 bg-neutral-900 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold">Global Kill Switch</span>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={config.globalKillSwitch}
              onChange={e => {
                onKillSwitch(e.target.checked);
                onConfigChange({ ...config, globalKillSwitch: e.target.checked });
              }}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-neutral-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
          </label>
        </div>
        <p className="text-xs text-neutral-400">
          {config.globalKillSwitch
            ? 'All AI auto-trading is disabled. Manual orders only.'
            : 'AI auto-trading is enabled. Toggle to disable all automated orders.'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCloseAll}
          className="flex items-center justify-center gap-2 rounded bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          <XCircle className="h-4 w-4" />
          Close All
        </button>
        {worstPosition.symbol && (
          <button
            onClick={() => onClosePosition(worstPosition.symbol)}
            className="flex items-center justify-center gap-2 rounded bg-orange-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            <TrendingDown className="h-4 w-4" />
            Close Worst
          </button>
        )}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 border-t border-neutral-700 pt-3"
        >
          {/* Max Drawdown */}
          <div>
            <label className="mb-1 block flex items-center gap-2 text-xs text-neutral-400">
              <AlertTriangle className="h-3 w-3" />
              Max Drawdown (%)
            </label>
            <input
              type="number"
              value={config.maxDrawdown}
              onChange={e =>
                onConfigChange({ ...config, maxDrawdown: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
              min="0"
              max="100"
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Auto-disable strategies if drawdown exceeds {config.maxDrawdown}%
            </p>
          </div>

          {/* Portfolio Stop Loss */}
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Portfolio Stop Loss ($)</label>
            <input
              type="number"
              value={config.portfolioStopLoss}
              onChange={e =>
                onConfigChange({ ...config, portfolioStopLoss: parseFloat(e.target.value) || 0 })
              }
              step="100"
              min="0"
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Close all positions if portfolio loss exceeds $
              {config.portfolioStopLoss.toLocaleString()}
            </p>
          </div>

          {/* Volatility Threshold */}
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Volatility Threshold (ATR)
            </label>
            <input
              type="number"
              value={config.volatilityThreshold}
              onChange={e =>
                onConfigChange({ ...config, volatilityThreshold: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
              min="0"
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Suspend auto-execute when volatility exceeds {config.volatilityThreshold}x ATR
            </p>
          </div>
        </motion.div>
      )}

      {/* Worst Position Alert */}
      {worstPosition.unrealizedPnL < -100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded border border-red-700 bg-red-900/30 p-3"
        >
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Worst Position Alert</span>
          </div>
          <div className="text-xs text-neutral-300">
            {worstPosition.symbol}: ${worstPosition.unrealizedPnL.toFixed(2)} unrealized loss
          </div>
        </motion.div>
      )}
    </div>
  );
}
