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
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold text-sm">Safe Exit Controls</h3>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          {showAdvanced ? 'Hide' : 'Advanced'}
        </button>
      </div>

      {/* Global Kill Switch */}
      <div className="bg-neutral-900 rounded p-3 border border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold">Global Kill Switch</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.globalKillSwitch}
              onChange={(e) => {
                onKillSwitch(e.target.checked);
                onConfigChange({ ...config, globalKillSwitch: e.target.checked });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
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
          className="bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Close All
        </button>
        {worstPosition.symbol && (
          <button
            onClick={() => onClosePosition(worstPosition.symbol)}
            className="bg-orange-600 hover:bg-orange-700 text-white py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <TrendingDown className="w-4 h-4" />
            Close Worst
          </button>
        )}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 pt-3 border-t border-neutral-700"
        >
          {/* Max Drawdown */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Max Drawdown (%)
            </label>
            <input
              type="number"
              value={config.maxDrawdown}
              onChange={(e) =>
                onConfigChange({ ...config, maxDrawdown: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
              min="0"
              max="100"
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Auto-disable strategies if drawdown exceeds {config.maxDrawdown}%
            </p>
          </div>

          {/* Portfolio Stop Loss */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Portfolio Stop Loss ($)</label>
            <input
              type="number"
              value={config.portfolioStopLoss}
              onChange={(e) =>
                onConfigChange({ ...config, portfolioStopLoss: parseFloat(e.target.value) || 0 })
              }
              step="100"
              min="0"
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Close all positions if portfolio loss exceeds ${config.portfolioStopLoss.toLocaleString()}
            </p>
          </div>

          {/* Volatility Threshold */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Volatility Threshold (ATR)</label>
            <input
              type="number"
              value={config.volatilityThreshold}
              onChange={(e) =>
                onConfigChange({ ...config, volatilityThreshold: parseFloat(e.target.value) || 0 })
              }
              step="0.1"
              min="0"
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
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
          className="bg-red-900/30 border border-red-700 rounded p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
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

