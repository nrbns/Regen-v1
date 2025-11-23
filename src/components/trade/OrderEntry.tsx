import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Shield, Target } from 'lucide-react';

export interface BracketOrder {
  stopLoss?: number;
  takeProfit?: number;
  stopLossType?: 'price' | 'percent' | 'atr';
  takeProfitType?: 'price' | 'percent' | 'atr';
}

export interface TrailingStop {
  distance: number;
  distanceType: 'price' | 'percent' | 'atr';
  activationPrice?: number;
}

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  bracket?: BracketOrder;
  trailingStop?: TrailingStop;
  paper?: boolean;
}

interface OrderEntryProps {
  symbol: string;
  currentPrice: number;
  atr?: number;
  onSubmit: (order: OrderRequest) => void;
  aiSuggestion?: {
    action: 'buy' | 'sell';
    price: number;
    confidence: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  preset?: {
    side: 'buy' | 'sell';
    price: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
  };
}

export default function OrderEntry({
  symbol,
  currentPrice,
  atr = 1.2,
  onSubmit,
  aiSuggestion,
  preset,
}: OrderEntryProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [useBracket, setUseBracket] = useState(true);
  const [stopLoss, setStopLoss] = useState(currentPrice * 0.98);
  const [takeProfit, setTakeProfit] = useState(currentPrice * 1.03);
  const [useTrailingStop, setUseTrailingStop] = useState(false);
  const [trailingDistance, setTrailingDistance] = useState(atr);
  const [paper, setPaper] = useState(true);

  useEffect(() => {
    if (!preset) return;
    setSide(preset.side);
    setLimitPrice(preset.price);
    setQuantity(Math.max(1, Math.round(preset.quantity)));
    setStopLoss(preset.stopLoss);
    setTakeProfit(preset.takeProfit);
  }, [preset]);

  const handleSubmit = () => {
    const order: OrderRequest = {
      symbol,
      side,
      quantity,
      orderType,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      timeInForce: 'day',
      bracket: useBracket
        ? {
            stopLoss,
            takeProfit,
            stopLossType: 'price',
            takeProfitType: 'price',
          }
        : undefined,
      trailingStop: useTrailingStop
        ? {
            distance: trailingDistance,
            distanceType: 'atr',
            activationPrice: takeProfit,
          }
        : undefined,
      paper,
    };

    onSubmit(order);
  };

  const applyAISuggestion = () => {
    if (!aiSuggestion) return;
    setSide(aiSuggestion.action);
    setLimitPrice(aiSuggestion.price);
    if (aiSuggestion.stopLoss) setStopLoss(aiSuggestion.stopLoss);
    if (aiSuggestion.takeProfit) setTakeProfit(aiSuggestion.takeProfit);
  };

  const riskAmount = Math.abs((stopLoss - limitPrice) * quantity);
  const rewardAmount = Math.abs((takeProfit - limitPrice) * quantity);
  const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

  return (
    <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Order Entry</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-400 flex items-center gap-1">
            <input
              type="checkbox"
              checked={paper}
              onChange={e => setPaper(e.target.checked)}
              className="w-3 h-3"
            />
            Paper
          </label>
        </div>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900/30 border border-indigo-700 rounded p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">AI Suggestion</span>
            </div>
            <span className="text-xs text-indigo-400">Confidence: {aiSuggestion.confidence}%</span>
          </div>
          <div className="text-xs text-neutral-300 mb-2">
            {aiSuggestion.action.toUpperCase()} {symbol} @ ${aiSuggestion.price.toFixed(2)}
          </div>
          <button
            onClick={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
              applyAISuggestion();
            }}
            onMouseDown={e => {
              (e as any).stopImmediatePropagation();
              e.stopPropagation();
            }}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded transition-colors"
            style={{ zIndex: 10011, isolation: 'isolate' }}
          >
            Apply Suggestion
          </button>
        </motion.div>
      )}

      {/* Side Selection */}
      <div className="flex gap-2">
        <button
          onClick={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
            setSide('buy');
          }}
          onMouseDown={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
          }}
          className={`flex-1 py-2 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
            side === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
          style={{ zIndex: 10011, isolation: 'isolate' }}
        >
          <TrendingUp className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
            setSide('sell');
          }}
          onMouseDown={e => {
            (e as any).stopImmediatePropagation();
            e.stopPropagation();
          }}
          className={`flex-1 py-2 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
            side === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          }`}
          style={{ zIndex: 10011, isolation: 'isolate' }}
        >
          <TrendingDown className="w-4 h-4" />
          Sell
        </button>
      </div>

      {/* Quantity */}
      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          min="1"
        />
      </div>

      {/* Order Type */}
      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Order Type</label>
        <select
          value={orderType}
          onChange={e => setOrderType(e.target.value as 'market' | 'limit')}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>

      {/* Limit Price */}
      {orderType === 'limit' && (
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Limit Price</label>
          <input
            type="number"
            value={limitPrice.toFixed(2)}
            onChange={e => setLimitPrice(parseFloat(e.target.value) || currentPrice)}
            step="0.01"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Bracket Order */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-400 flex items-center gap-2">
          <input
            type="checkbox"
            checked={useBracket}
            onChange={e => setUseBracket(e.target.checked)}
            className="w-3 h-3"
          />
          <Shield className="w-3 h-3" />
          Bracket Order (Stop Loss + Take Profit)
        </label>

        {useBracket && (
          <div className="space-y-2 pl-5">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Stop Loss</label>
              <input
                type="number"
                value={stopLoss.toFixed(2)}
                onChange={e => setStopLoss(parseFloat(e.target.value) || currentPrice)}
                step="0.01"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Take Profit</label>
              <input
                type="number"
                value={takeProfit.toFixed(2)}
                onChange={e => setTakeProfit(parseFloat(e.target.value) || currentPrice)}
                step="0.01"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Trailing Stop */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-400 flex items-center gap-2">
          <input
            type="checkbox"
            checked={useTrailingStop}
            onChange={e => setUseTrailingStop(e.target.checked)}
            className="w-3 h-3"
          />
          Trailing Stop (ATR-based)
        </label>
        {useTrailingStop && (
          <div className="pl-5">
            <label className="text-xs text-neutral-400 mb-1 block">Distance (ATR)</label>
            <input
              type="number"
              value={trailingDistance.toFixed(2)}
              onChange={e => setTrailingDistance(parseFloat(e.target.value) || atr)}
              step="0.1"
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Risk/Reward Summary */}
      {useBracket && (
        <div className="bg-neutral-900 rounded p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-400">Risk:</span>
            <span className="text-red-400">${riskAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Reward:</span>
            <span className="text-green-400">${rewardAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">R:R Ratio:</span>
            <span className={riskRewardRatio >= 1.5 ? 'text-green-400' : 'text-yellow-400'}>
              {riskRewardRatio.toFixed(2)}:1
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={e => {
          (e as any).stopImmediatePropagation();
          e.stopPropagation();
          handleSubmit();
        }}
        onMouseDown={e => {
          (e as any).stopImmediatePropagation();
          e.stopPropagation();
        }}
        className={`w-full py-3 rounded font-semibold text-sm transition-colors ${
          side === 'buy'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
        style={{ zIndex: 10011, isolation: 'isolate' }}
      >
        {side === 'buy' ? 'Buy' : 'Sell'} {quantity} {symbol}
      </button>
    </div>
  );
}
