import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface TradesTapeProps {
  trades: Trade[];
  maxVisible?: number;
  symbol?: string;
}

export default function TradesTape({ trades, maxVisible = 20, symbol }: TradesTapeProps) {
  const [visibleTrades, setVisibleTrades] = useState<Trade[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show most recent trades
    const recent = trades.slice(-maxVisible).reverse();
    setVisibleTrades(recent);
  }, [trades, maxVisible]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-2">
        <h3 className="text-xs font-semibold text-gray-300">Recent Trades</h3>
        {symbol && <span className="text-xs text-gray-400">{symbol}</span>}
      </div>

      {/* Trades List */}
      <div
        ref={containerRef}
        className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 h-48 overflow-y-auto"
      >
        <div className="divide-y divide-gray-800">
          <AnimatePresence initial={false}>
            {visibleTrades.length > 0 ? (
              visibleTrades.map(trade => {
                const isBuy = trade.side === 'buy';
                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                      isBuy ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isBuy ? (
                        <ArrowUp size={12} className="text-green-400" />
                      ) : (
                        <ArrowDown size={12} className="text-red-400" />
                      )}
                      <span className={`font-medium ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span>{trade.quantity.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-gray-500">No recent trades</div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
