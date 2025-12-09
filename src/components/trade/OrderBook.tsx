import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface OrderBookEntry {
  price: number;
  quantity: number;
  cumulative?: number;
}

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  maxDepth?: number;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
}

export default function OrderBook({ bids, asks, maxDepth = 10, onPriceClick }: OrderBookProps) {
  const displayBids = bids.slice(0, maxDepth).reverse();
  const displayAsks = asks.slice(0, maxDepth);

  // Calculate cumulative volumes
  let bidCumulative = 0;
  const bidsWithCumulative = displayBids.map(bid => {
    bidCumulative += bid.quantity;
    return { ...bid, cumulative: bidCumulative };
  });

  let askCumulative = 0;
  const asksWithCumulative = displayAsks.map(ask => {
    askCumulative += ask.quantity;
    return { ...ask, cumulative: askCumulative };
  });

  const maxCumulative = Math.max(
    ...bidsWithCumulative.map(b => b.cumulative || 0),
    ...asksWithCumulative.map(a => a.cumulative || 0)
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-3">
        <h3 className="text-sm font-semibold text-gray-300">Order Book</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Top {maxDepth}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-700">
        {/* Asks (Sell Orders) */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-700 bg-red-900/20 p-2">
            <TrendingUp size={14} className="text-red-400" />
            <span className="text-xs font-semibold text-red-400">Asks (Sell)</span>
          </div>
          <div className="space-y-0.5 p-2">
            {displayAsks.length > 0 ? (
              asksWithCumulative.map((ask, idx) => {
                const widthPercent = ((ask.cumulative || 0) / maxCumulative) * 100;
                return (
                  <motion.button
                    key={`ask-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onPriceClick?.(ask.price, 'sell')}
                    className="group relative flex w-full items-center justify-between rounded px-2 py-1 transition-colors hover:bg-red-900/20"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 rounded bg-red-900/20"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative z-10 flex w-full items-center justify-between text-xs">
                      <span className="font-medium text-red-400">{ask.price.toFixed(2)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{ask.quantity.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-500">
                          {ask.cumulative?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-gray-500">No asks</div>
            )}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-700 bg-green-900/20 p-2">
            <TrendingDown size={14} className="text-green-400" />
            <span className="text-xs font-semibold text-green-400">Bids (Buy)</span>
          </div>
          <div className="space-y-0.5 p-2">
            {displayBids.length > 0 ? (
              bidsWithCumulative.map((bid, idx) => {
                const widthPercent = ((bid.cumulative || 0) / maxCumulative) * 100;
                return (
                  <motion.button
                    key={`bid-${idx}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onPriceClick?.(bid.price, 'buy')}
                    className="group relative flex w-full items-center justify-between rounded px-2 py-1 transition-colors hover:bg-green-900/20"
                  >
                    <div
                      className="absolute bottom-0 right-0 top-0 rounded bg-green-900/20"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative z-10 flex w-full items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500">
                          {bid.cumulative?.toLocaleString()}
                        </span>
                        <span className="text-gray-400">{bid.quantity.toLocaleString()}</span>
                      </div>
                      <span className="font-medium text-green-400">{bid.price.toFixed(2)}</span>
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-gray-500">No bids</div>
            )}
          </div>
        </div>
      </div>

      {/* Spread */}
      {displayAsks.length > 0 && displayBids.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-800/30 p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Spread</span>
            <span className="font-semibold text-yellow-400">
              {(displayAsks[0].price - displayBids[0].price).toFixed(2)} (
              {(
                ((displayAsks[0].price - displayBids[0].price) / displayBids[0].price) *
                100
              ).toFixed(3)}
              %)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}







