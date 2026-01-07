import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export interface AISignal {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'close';
  confidence: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;
  rationale: string;
  contributingFactors: Array<{
    factor: string;
    weight: number;
    value: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  modelVersion: string;
  generatedAt: string;
  expiresAt: string;
  riskMetrics?: {
    maxLoss: number;
    maxGain: number;
    riskRewardRatio: number;
    winProbability: number;
    portfolioRiskPercent: number;
  };
}

interface AISignalPanelProps {
  symbol: string;
  signal?: AISignal;
  onApplySignal?: (signal: AISignal) => void;
  onGenerateSignal?: (symbol: string) => void;
  isLoading?: boolean;
}

export default function AISignalPanel({
  symbol,
  signal,
  onApplySignal,
  onGenerateSignal,
  isLoading = false,
}: AISignalPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);

  const confidenceColor =
    (signal?.confidence ?? 0) >= 70 ? 'text-green-400' : (signal?.confidence ?? 0) >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700">
      {/* Header */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm">AI Signal</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {!signal && (
          <button
            onClick={() => onGenerateSignal?.(symbol)}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white py-2 rounded text-sm font-semibold transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Signal'}
          </button>
        )}

        {signal && (
          <div className="space-y-3">
            {/* Signal Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {signal.action === 'buy' ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : signal.action === 'sell' ? (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="font-semibold text-sm">
                  {signal.action.toUpperCase()} {signal.symbol}
                </span>
              </div>
              <div className={`font-bold ${confidenceColor}`}>{signal.confidence}%</div>
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <div>
                Entry: <span className="font-semibold">${signal.entryPrice.toFixed(2)}</span>
              </div>
              {signal.stopLoss && (
                <div>
                  Stop: <span className="font-semibold text-red-400">${signal.stopLoss.toFixed(2)}</span>
                </div>
              )}
              {signal.takeProfit && (
                <div>
                  Target: <span className="font-semibold text-green-400">${signal.takeProfit.toFixed(2)}</span>
                </div>
              )}
              <div>
                Size: <span className="font-semibold">{signal.positionSize} shares</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onApplySignal?.(signal)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-xs font-semibold transition-colors"
              >
                Apply to Order
              </button>
              <button
                onClick={() => setShowExplainability(!showExplainability)}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded text-xs font-semibold transition-colors"
              >
                {showExplainability ? 'Hide' : 'Explain'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && signal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-neutral-700">
              {/* Rationale */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-400 mb-2">Rationale</h4>
                <p className="text-xs text-neutral-300">{signal.rationale}</p>
              </div>

              {/* Risk Metrics */}
              {signal.riskMetrics && (
                <div className="bg-neutral-900 rounded p-3 space-y-2 text-xs">
                  <h4 className="text-xs font-semibold text-neutral-400 mb-2">Risk Assessment</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-neutral-400">Max Loss:</span>
                      <span className="text-red-400 ml-2">${signal.riskMetrics.maxLoss.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Max Gain:</span>
                      <span className="text-green-400 ml-2">${signal.riskMetrics.maxGain.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">R:R Ratio:</span>
                      <span className="ml-2">{signal.riskMetrics.riskRewardRatio.toFixed(2)}:1</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Win Prob:</span>
                      <span className="ml-2">{(signal.riskMetrics.winProbability * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contributing Factors */}
              {showExplainability && signal.contributingFactors && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-400 mb-2">Contributing Factors</h4>
                  <div className="space-y-2">
                    {signal.contributingFactors.map((factor, idx) => (
                      <div key={idx} className="bg-neutral-900 rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{factor.factor}</span>
                          <span className={`text-xs ${
                            factor.impact === 'positive' ? 'text-green-400' :
                            factor.impact === 'negative' ? 'text-red-400' : 'text-neutral-400'
                          }`}>
                            {factor.impact}
                          </span>
                        </div>
                        <p className="text-neutral-300 text-xs">{factor.description}</p>
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span>Weight: {(factor.weight * 100).toFixed(0)}%</span>
                            <span>Value: {factor.value.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Info */}
              <div className="text-xs text-neutral-500">
                <div>Model: {signal.modelVersion}</div>
                <div>Generated: {new Date(signal.generatedAt).toLocaleString()}</div>
                <div>Expires: {new Date(signal.expiresAt).toLocaleString()}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

