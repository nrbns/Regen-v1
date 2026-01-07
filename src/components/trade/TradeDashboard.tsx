import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MarketSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface RiskMetrics {
  totalExposure: number;
  dailyPnL: number;
  marginUsed: number;
  marginAvailable: number;
  worstOpenTrade: number;
  maxDrawdown: number;
  portfolioValue: number;
  riskScore: number;
}

interface TradeDashboardProps {
  marketSnapshots: MarketSnapshot[];
  riskMetrics: RiskMetrics;
  onSymbolClick?: (symbol: string) => void;
}

export default function TradeDashboard({ marketSnapshots, riskMetrics, onSymbolClick }: TradeDashboardProps) {
  const pnlColor = riskMetrics.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400';
  const riskColor = riskMetrics.riskScore < 30 ? 'text-green-400' : riskMetrics.riskScore < 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Market Snapshot Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {marketSnapshots.map((snapshot) => (
          <motion.div
            key={snapshot.symbol}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-neutral-800 rounded-lg p-3 cursor-pointer border border-neutral-700 hover:border-indigo-500 transition-colors"
            onClick={() => onSymbolClick?.(snapshot.symbol)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{snapshot.symbol}</span>
              {snapshot.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="text-lg font-bold">${snapshot.price.toFixed(2)}</div>
            <div className={`text-xs ${snapshot.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {snapshot.change >= 0 ? '+' : ''}{snapshot.change.toFixed(2)} ({snapshot.changePercent >= 0 ? '+' : ''}
              {snapshot.changePercent.toFixed(2)}%)
            </div>
            <div className="text-xs text-neutral-400 mt-1">Vol: {(snapshot.volume / 1000000).toFixed(2)}M</div>
          </motion.div>
        ))}
      </div>

      {/* Risk Bar */}
      <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Dashboard
          </h3>
          <div className={`text-sm font-semibold ${riskColor}`}>
            Risk Score: {riskMetrics.riskScore}/100
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-neutral-400 mb-1">Total Exposure</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {riskMetrics.totalExposure.toLocaleString()}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-neutral-400 mb-1">Daily P&L</div>
            <div className={`text-lg font-semibold ${pnlColor}`}>
              {riskMetrics.dailyPnL >= 0 ? '+' : ''}${riskMetrics.dailyPnL.toFixed(2)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-neutral-400 mb-1">Margin Used</div>
            <div className="text-lg font-semibold">
              ${riskMetrics.marginUsed.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500">
              {((riskMetrics.marginUsed / riskMetrics.portfolioValue) * 100).toFixed(1)}% of portfolio
            </div>
          </div>
          
          <div>
            <div className="text-xs text-neutral-400 mb-1">Worst Trade</div>
            <div className="text-lg font-semibold text-red-400">
              ${riskMetrics.worstOpenTrade.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Portfolio Value</span>
            <span className="font-semibold">${riskMetrics.portfolioValue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-neutral-400">Max Drawdown</span>
            <span className="font-semibold text-red-400">{riskMetrics.maxDrawdown.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

