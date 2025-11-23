import { useState, useEffect } from 'react';
import TradeDashboard, { MarketSnapshot, RiskMetrics } from '../../components/trade/TradeDashboard';
import type { CandleData } from '../../components/trade/TradingChart';
import OrderEntry, { OrderRequest } from '../../components/trade/OrderEntry';
import AISignalPanel, { AISignal } from '../../components/trade/AISignalPanel';
import SafeExitControls, { SafeExitConfig } from '../../components/trade/SafeExitControls';
import OrderBlotter from '../../components/trade/OrderBlotter';
import SymbolSearch from '../../components/trade/SymbolSearch';
import Watchlist from '../../components/trade/Watchlist';
import RiskManager, { type RiskPlanSummary } from '../../components/trade/RiskManager';
import TradingViewChart, { type IndicatorConfig } from './components/TradingViewChart';
import TimeframeSelector from './components/TimeframeSelector';
import IndicatorsPanel from './components/Indicators';
import { ipc } from '../../lib/ipc-typed';
import { aiEngine, type AITaskResult } from '../../core/ai';
import { semanticSearchMemories } from '../../core/supermemory/search';
import { toast } from '../../utils/toast';

const TRADE_PREFS_STORAGE_KEY = 'trade_mode_preferences_v1';

type TradePreferences = {
  timeframe: string;
  indicators: IndicatorConfig[];
};

export default function TradePanel() {
  const [balance, setBalance] = useState({
    cash: 100000,
    buyingPower: 200000,
    portfolioValue: 100000,
  });
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('60');
  const [currentPrice, setCurrentPrice] = useState(150.0);
  const [atr] = useState(1.2);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [, setIsLoadingChart] = useState(false);
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig[]>([
    { id: 'sma20', label: 'SMA 20', type: 'sma', period: 20, color: '#f97316', enabled: true },
    { id: 'ema50', label: 'EMA 50', type: 'ema', period: 50, color: '#a855f7', enabled: false },
    {
      id: 'rsi14',
      label: 'RSI 14',
      type: 'rsi',
      period: 14,
      color: '#22d3ee',
      enabled: false,
      upperBand: 70,
      lowerBand: 30,
    },
    {
      id: 'macd',
      label: 'MACD 12/26/9',
      type: 'macd',
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      color: '#34d399',
      signalColor: '#facc15',
      histogramColor: '#f87171',
      enabled: false,
    },
  ]);
  const [recentSymbols, setRecentSymbols] = useState<string[]>(['AAPL', 'MSFT', 'TSLA', 'BTC-USD']);
  const [riskPreset, setRiskPreset] = useState<{
    side: 'buy' | 'sell';
    price: number;
    stopLoss: number;
    takeProfit: number;
    quantity: number;
  } | null>(null);

  // Market snapshots (will be updated from real data)
  const [marketSnapshots, setMarketSnapshots] = useState<MarketSnapshot[]>([
    { symbol: 'AAPL', price: 150.25, change: 2.5, changePercent: 1.69, volume: 1250000 },
    { symbol: 'MSFT', price: 380.5, change: -1.2, changePercent: -0.31, volume: 890000 },
    { symbol: 'GOOGL', price: 142.3, change: 0.8, changePercent: 0.56, volume: 2100000 },
    { symbol: 'TSLA', price: 245.75, change: -5.2, changePercent: -2.07, volume: 3200000 },
  ]);

  // Risk metrics (will be calculated from real positions)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    totalExposure: 50000,
    dailyPnL: 1250.5,
    marginUsed: 15000,
    marginAvailable: 35000,
    worstOpenTrade: -350.0,
    maxDrawdown: 2.5,
    portfolioValue: 100000,
    riskScore: 45,
  });

  // Positions
  const [openPositions, setOpenPositions] = useState<
    Array<{ symbol: string; unrealizedPnL: number }>
  >([]);

  // AI Signal state
  const [aiSignal, setAiSignal] = useState<AISignal | undefined>();
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);

  // Safe Exit Config
  const [safeExitConfig, setSafeExitConfig] = useState<SafeExitConfig>({
    maxDrawdown: 5.0,
    portfolioStopLoss: 2000,
    volatilityThreshold: 2.0,
    globalKillSwitch: false,
  });

  // Load persisted preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(TRADE_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<TradePreferences>;
      if (parsed.timeframe && typeof parsed.timeframe === 'string') {
        setTimeframe(parsed.timeframe);
      }
      if (Array.isArray(parsed.indicators)) {
        setIndicatorConfig(prev =>
          prev.map(indicator => {
            const saved = parsed.indicators?.find(item => item?.id === indicator.id);
            return saved ? ({ ...indicator, ...saved } as IndicatorConfig) : indicator;
          })
        );
      }
    } catch (error) {
      console.warn('[Trade] Failed to load trade preferences:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const preferences: TradePreferences = {
        timeframe,
        indicators: indicatorConfig,
      };
      localStorage.setItem(TRADE_PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('[Trade] Failed to persist trade preferences:', error);
    }
  }, [timeframe, indicatorConfig]);

  // Eco-balanced mode: Auto-hibernate on high RAM in Trade mode
  useEffect(() => {
    const checkMemoryAndHibernate = async () => {
      try {
        // Get memory usage from Redix metrics endpoint
        const redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
        const metricsResponse = await fetch(`${redixUrl}/metrics`).catch(() => null);

        if (metricsResponse?.ok) {
          const metrics = await metricsResponse.json();
          const memoryMB = metrics.memory || 0;

          // If memory > 2GB, suggest hibernating inactive tabs
          if (memoryMB > 2048) {
            try {
              if (typeof (ipc as any).efficiency?.hibernateInactiveTabs === 'function') {
                await (ipc as any).efficiency.hibernateInactiveTabs();
                console.debug(
                  '[Trade] Auto-hibernated inactive tabs due to high memory:',
                  memoryMB,
                  'MB'
                );
              }
            } catch (error) {
              console.debug('[Trade] Auto-hibernate failed:', error);
            }
          }
        }
      } catch (error) {
        console.debug('[Trade] Memory check failed:', error);
      }
    };

    // Check memory every 30 seconds
    checkMemoryAndHibernate();
    const interval = setInterval(checkMemoryAndHibernate, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const normalized = symbol.toUpperCase();
    setRecentSymbols(prev => {
      if (prev[0] === normalized) return prev;
      const next = [normalized, ...prev.filter(sym => sym !== normalized)];
      return next.slice(0, 8);
    });
    setRiskPreset(null);
  }, [symbol]);

  // Load initial data
  useEffect(() => {
    loadBalance();
    loadPositions();
    loadChartData();
    loadMarketSnapshots();
  }, []);

  // Load chart data when symbol or timeframe changes
  useEffect(() => {
    loadChartData();
    loadQuote();
  }, [symbol, timeframe]);

  // Update quote periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadQuote();
      loadPositions();
      loadBalance();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [symbol]);

  // AI-powered trading signals using unified AI engine
  useEffect(() => {
    if (!symbol) return;

    // Periodically fetch AI insights for current symbol
    const fetchAISignal = async () => {
      try {
        setIsGeneratingSignal(true);

        // Build trading context
        const context: any = {
          mode: 'trade',
          symbol,
          currentPrice,
          timeframe,
          riskMetrics: {
            totalExposure: riskMetrics.totalExposure,
            portfolioValue: riskMetrics.portfolioValue,
            riskScore: riskMetrics.riskScore,
          },
          openPositions: openPositions.length,
        };

        // Fetch relevant trading memories
        let relevantMemories: any[] = [];
        try {
          const memoryMatches = await semanticSearchMemories(
            `${symbol} trading analysis ${currentPrice}`,
            { limit: 3, minSimilarity: 0.6 }
          );
          relevantMemories = memoryMatches.map(m => ({
            value: m.event.value,
            metadata: m.event.metadata,
            similarity: m.similarity,
          }));
        } catch (error) {
          console.warn('[Trade] Failed to fetch memory context:', error);
        }

        if (relevantMemories.length > 0) {
          context.memories = relevantMemories;
        }

        // Use unified AI engine for trading analysis
        const tradingPrompt = `Analyze ${symbol} stock trading opportunity. Current price: $${currentPrice.toFixed(2)}. 
Provide a trading signal (buy/sell/hold) with:
1. Entry price recommendation
2. Stop loss level (risk management)
3. Take profit target
4. Position size suggestion
5. Confidence level (0-100)
6. Rationale based on technical and fundamental analysis
7. Risk/reward ratio
8. Key contributing factors

Format the response as structured trading analysis.`;

        let streamedText = '';
        let streamedResult: AITaskResult | null = null;

        const aiResult = await aiEngine.runTask(
          {
            kind: 'agent',
            prompt: tradingPrompt,
            context,
            mode: 'trade',
            metadata: {
              symbol,
              currentPrice,
              timeframe,
            },
            llm: {
              temperature: 0.3, // Lower temperature for more consistent trading signals
              maxTokens: 800,
            },
          },
          event => {
            if (event.type === 'token' && typeof event.data === 'string') {
              streamedText += event.data;
            } else if (event.type === 'done' && typeof event.data !== 'string') {
              streamedResult = event.data as AITaskResult;
            }
          }
        );

        const finalResult = streamedResult ?? aiResult;
        const analysis = streamedText || finalResult?.text || '';

        // Parse AI response to extract trading signal
        // Try to extract structured data from the response
        const actionMatch = analysis.match(/(?:signal|action|recommendation):\s*(buy|sell|hold)/i);
        const confidenceMatch = analysis.match(/(?:confidence|certainty):\s*(\d+)/i);
        const stopLossMatch = analysis.match(/(?:stop\s*loss|stop):\s*\$?([\d.]+)/i);
        const takeProfitMatch = analysis.match(/(?:take\s*profit|target):\s*\$?([\d.]+)/i);
        const riskRewardMatch = analysis.match(/(?:risk[-\s]?reward|r:r):\s*([\d.]+)/i);

        const action = actionMatch
          ? (actionMatch[1].toLowerCase() as 'buy' | 'sell' | 'hold')
          : 'hold';
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) / 100 : 0.7;
        const stopLoss = stopLossMatch ? parseFloat(stopLossMatch[1]) : currentPrice * 0.98;
        const takeProfit = takeProfitMatch ? parseFloat(takeProfitMatch[1]) : currentPrice * 1.05;
        const riskReward = riskRewardMatch ? parseFloat(riskRewardMatch[1]) : 2.5;

        // Calculate position size based on risk metrics
        const portfolioRisk = riskMetrics.portfolioValue * 0.02; // 2% portfolio risk
        const riskPerShare = Math.abs(currentPrice - stopLoss);
        const positionSize = riskPerShare > 0 ? Math.floor(portfolioRisk / riskPerShare) : 100;

        setAiSignal({
          id: `ai-signal-${Date.now()}`,
          symbol,
          action,
          confidence: Math.round(confidence * 100),
          entryPrice: currentPrice,
          stopLoss,
          takeProfit,
          positionSize,
          rationale: analysis.substring(0, 300),
          contributingFactors: [
            {
              factor: 'ai_analysis',
              weight: 0.6,
              value: confidence,
              impact: action === 'buy' ? 'positive' : action === 'sell' ? 'negative' : 'neutral',
              description: `AI analysis using ${finalResult?.provider || 'unknown'} (${finalResult?.model || 'unknown'})`,
            },
            ...(finalResult?.citations?.length
              ? [
                  {
                    factor: 'source_count',
                    weight: 0.2,
                    value: finalResult.citations.length / 10,
                    impact: 'positive' as const,
                    description: `${finalResult.citations.length} data sources analyzed`,
                  },
                ]
              : []),
          ],
          modelVersion: finalResult?.model || 'unknown',
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
          riskMetrics: {
            maxLoss: Math.abs(currentPrice - stopLoss) * positionSize,
            maxGain: Math.abs(takeProfit - currentPrice) * positionSize,
            riskRewardRatio: riskReward,
            winProbability: confidence,
            portfolioRiskPercent:
              ((Math.abs(currentPrice - stopLoss) * positionSize) / riskMetrics.portfolioValue) *
              100,
          },
        });
      } catch (error) {
        console.error('[Trade] AI signal generation failed:', error);
        // Fallback to mock signal if AI fails
        generateAISignal(symbol);
      } finally {
        setIsGeneratingSignal(false);
      }
    };

    // Fetch AI signal every 30 seconds
    fetchAISignal();
    const interval = setInterval(fetchAISignal, 30000);
    return () => clearInterval(interval);
  }, [symbol, currentPrice, timeframe, riskMetrics, openPositions]);

  const loadBalance = async () => {
    try {
      const balanceData = await ipc.trade.getBalance();
      setBalance(balanceData);
      // Update risk metrics with real balance
      setRiskMetrics(prev => ({
        ...prev,
        portfolioValue: balanceData.portfolioValue,
        marginAvailable: balanceData.buyingPower - balanceData.cash,
      }));
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadPositions = async () => {
    try {
      const { positions } = await ipc.trade.getPositions();
      const positionsList = positions.map(pos => ({
        symbol: pos.symbol,
        unrealizedPnL: pos.unrealizedPnL,
      }));
      setOpenPositions(positionsList);

      // Calculate risk metrics from positions
      const totalExposure = positions.reduce(
        (sum, pos) => sum + pos.quantity * pos.currentPrice,
        0
      );
      const dailyPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL + pos.realizedPnL, 0);
      const worstTrade = positions.reduce(
        (worst, pos) => (pos.unrealizedPnL < worst ? pos.unrealizedPnL : worst),
        0
      );

      setRiskMetrics(prev => ({
        ...prev,
        totalExposure,
        dailyPnL,
        worstOpenTrade: worstTrade,
      }));
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const loadQuote = async () => {
    try {
      const quote = await ipc.trade.getQuote(symbol);
      setCurrentPrice(quote.last);
      // Update market snapshot for current symbol
      setMarketSnapshots(prev =>
        prev.map(snap =>
          snap.symbol === symbol
            ? {
                ...snap,
                price: quote.last,
                change: quote.last - (snap.price - snap.change),
                changePercent:
                  ((quote.last - (snap.price - snap.change)) / (snap.price - snap.change)) * 100,
                volume: quote.volume,
              }
            : snap
        )
      );
    } catch (error) {
      console.error('Failed to load quote:', error);
    }
  };

  const loadChartData = async () => {
    setIsLoadingChart(true);
    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - 86400 * 7; // 7 days of data
      const { candles } = await ipc.trade.getCandles({
        symbol,
        timeframe,
        from,
        to,
      });

      if (candles.length > 0) {
        setChartData(candles);
      } else {
        // Generate mock data if no real data available
        generateMockChartData();
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      generateMockChartData();
    } finally {
      setIsLoadingChart(false);
    }
  };

  const generateMockChartData = () => {
    const mockData: CandleData[] = [];
    const now = Math.floor(Date.now() / 1000);
    let price = currentPrice;

    for (let i = 100; i >= 0; i--) {
      const change = (Math.random() - 0.5) * 2;
      price += change;
      const open = price;
      const close = price + (Math.random() - 0.5) * 1;
      const high = Math.max(open, close) + Math.random() * 0.5;
      const low = Math.min(open, close) - Math.random() * 0.5;

      mockData.push({
        time: (now - i * 60) as any,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000),
      });
    }

    setChartData(mockData);
  };

  const loadMarketSnapshots = async () => {
    // Load quotes for all snapshot symbols
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
    try {
      const quotes = await Promise.all(
        symbols.map(sym => ipc.trade.getQuote(sym).catch(() => null))
      );
      setMarketSnapshots(prev =>
        prev.map((snap, idx) => {
          const quote = quotes[idx];
          if (quote) {
            return {
              ...snap,
              price: quote.last,
              volume: quote.volume,
            };
          }
          return snap;
        })
      );
    } catch (error) {
      console.error('Failed to load market snapshots:', error);
    }
  };

  const handleToggleIndicator = (id: string) => {
    setIndicatorConfig(prev =>
      prev.map(indicator =>
        indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator
      )
    );
  };

  const handleUpdateIndicator = (id: string, updates: Partial<IndicatorConfig>) => {
    setIndicatorConfig(prev =>
      prev.map(indicator =>
        indicator.id === id ? ({ ...indicator, ...updates } as IndicatorConfig) : indicator
      )
    );
  };

  const handleTimeframeChange = (nextTimeframe: string) => {
    setTimeframe(nextTimeframe);
  };

  const handleSymbolSelect = (nextSymbol: string) => {
    const normalized = nextSymbol.toUpperCase();
    setSymbol(normalized);
    generateAISignal(normalized);
  };

  const handleRiskPlanApply = (plan: RiskPlanSummary) => {
    setRiskPreset({
      side: plan.direction === 'long' ? 'buy' : 'sell',
      price: plan.entryPrice,
      stopLoss: plan.stopLoss,
      takeProfit: plan.takeProfit,
      quantity: plan.positionSize || 1,
    });
  };

  // Generate mock AI signal
  const generateAISignal = async (sym: string) => {
    setIsGeneratingSignal(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockSignal: AISignal = {
      id: `signal-${Date.now()}`,
      symbol: sym,
      action: 'buy',
      confidence: 72,
      entryPrice: currentPrice,
      stopLoss: currentPrice * 0.98,
      takeProfit: currentPrice * 1.03,
      positionSize: 100,
      rationale:
        'Rising volume (1.5x average) combined with RSI oversold (42) suggests mean reversion opportunity. MACD showing bullish crossover.',
      contributingFactors: [
        {
          factor: 'volume_spike',
          weight: 0.35,
          value: 1.52,
          impact: 'positive',
          description: 'Volume 1.52x 20-day average indicates strong interest',
        },
        {
          factor: 'rsi_oversold',
          weight: 0.28,
          value: 42,
          impact: 'positive',
          description: 'RSI at 42 suggests oversold condition, potential bounce',
        },
        {
          factor: 'macd_crossover',
          weight: 0.22,
          value: 0.15,
          impact: 'positive',
          description: 'MACD line crossed above signal line (bullish)',
        },
      ],
      modelVersion: 'signal-v2.1.3',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      riskMetrics: {
        maxLoss: 350,
        maxGain: 550,
        riskRewardRatio: 1.57,
        winProbability: 0.68,
        portfolioRiskPercent: 2.1,
      },
    };

    setAiSignal(mockSignal);
    setIsGeneratingSignal(false);
  };

  // Handle order submission
  const handleOrderSubmit = async (order: OrderRequest) => {
    try {
      await ipc.trade.placeOrder({
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        orderType: order.orderType,
        limitPrice: order.limitPrice,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce || 'day',
        bracket:
          order.bracket &&
          order.bracket.stopLoss !== undefined &&
          order.bracket.takeProfit !== undefined
            ? {
                stopLoss: order.bracket.stopLoss,
                takeProfit: order.bracket.takeProfit,
                stopLossType: order.bracket.stopLossType,
                takeProfitType: order.bracket.takeProfitType,
              }
            : undefined,
        trailingStop: order.trailingStop,
        paper: order.paper ?? true,
        aiSignalId: aiSignal?.id,
      });

      // Reload balance and positions
      await loadBalance();
      await loadPositions();

      // Show success notification with toast
      toast.success(
        `Order placed: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}${order.paper ? ' (Paper)' : ''}`
      );
    } catch (error) {
      console.error('Failed to place order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to place order: ${errorMessage}`);

      // Retry logic for network errors
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      ) {
        const retry = window.confirm('Network error detected. Would you like to retry?');
        if (retry) {
          // Retry after a short delay
          setTimeout(() => {
            handleOrderSubmit(order);
          }, 1000);
        }
      }
    }
  };

  // AI-powered position sizing helper
  const calculatePositionSize = async (
    entryPrice: number,
    stopLoss: number,
    riskAmount: number = riskMetrics.portfolioValue * 0.02 // 2% default
  ): Promise<number> => {
    try {
      const riskPerShare = Math.abs(entryPrice - stopLoss);
      if (riskPerShare <= 0) return 100; // Default if invalid

      // Basic calculation
      let positionSize = Math.floor(riskAmount / riskPerShare);

      // Use AI to refine position size if available
      try {
        const context: any = {
          mode: 'trade',
          symbol,
          entryPrice,
          stopLoss,
          riskAmount,
          portfolioValue: riskMetrics.portfolioValue,
          currentExposure: riskMetrics.totalExposure,
        };

        const sizingPrompt = `Calculate optimal position size for ${symbol}:
- Entry price: $${entryPrice.toFixed(2)}
- Stop loss: $${stopLoss.toFixed(2)}
- Risk amount: $${riskAmount.toFixed(2)} (${((riskAmount / riskMetrics.portfolioValue) * 100).toFixed(2)}% of portfolio)
- Current portfolio value: $${riskMetrics.portfolioValue.toFixed(2)}
- Current total exposure: $${riskMetrics.totalExposure.toFixed(2)}

Consider:
1. Portfolio concentration limits (max 10% per position)
2. Liquidity constraints
3. Volatility-adjusted sizing
4. Correlation with existing positions

Provide the recommended position size (number of shares) and brief rationale.`;

        const aiResult = await aiEngine.runTask({
          kind: 'agent',
          prompt: sizingPrompt,
          context,
          mode: 'trade',
          metadata: { symbol, entryPrice, stopLoss },
          llm: { temperature: 0.2, maxTokens: 300 },
        });

        // Try to extract position size from AI response
        const sizeMatch = aiResult.text.match(/(?:position\s*size|shares|quantity):\s*(\d+)/i);
        if (sizeMatch) {
          const aiSize = parseInt(sizeMatch[1], 10);
          // Use AI suggestion if it's reasonable (within 50-200% of calculated)
          if (aiSize > 0 && aiSize >= positionSize * 0.5 && aiSize <= positionSize * 2) {
            positionSize = aiSize;
          }
        }
      } catch (aiError) {
        console.debug('[Trade] AI position sizing failed, using calculated value:', aiError);
      }

      // Apply portfolio concentration limit (max 10% per position)
      const maxPositionValue = riskMetrics.portfolioValue * 0.1;
      const maxSharesByValue = Math.floor(maxPositionValue / entryPrice);
      positionSize = Math.min(positionSize, maxSharesByValue);

      return Math.max(1, positionSize); // At least 1 share
    } catch (error) {
      console.error('[Trade] Position sizing calculation failed:', error);
      return 100; // Fallback
    }
  };

  // Handle AI signal application
  const handleApplySignal = async (signal: AISignal) => {
    // Auto-fill order entry with signal data
    setCurrentPrice(signal.entryPrice);

    // Calculate optimal position size
    const optimalSize = await calculatePositionSize(
      signal.entryPrice,
      signal.stopLoss ?? signal.entryPrice * 0.98, // Default 2% stop loss if not provided
      riskMetrics.portfolioValue * 0.02 // 2% risk
    );

    // Update signal with calculated position size
    setAiSignal({
      ...signal,
      positionSize: optimalSize,
    });

    console.log('Applying signal:', signal, 'with position size:', optimalSize);
  };

  // Handle safe exit actions
  const handleKillSwitch = (enabled: boolean) => {
    console.log('Kill switch:', enabled ? 'ON' : 'OFF');
    // TODO: Implement kill switch logic via IPC
  };

  const handleCloseAll = async () => {
    try {
      // Close all positions
      for (const pos of openPositions) {
        await ipc.trade.closePosition(pos.symbol);
      }
      await loadPositions();
      await loadBalance();
      toast.success('All positions closed');
    } catch (error) {
      console.error('Failed to close all positions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to close all positions: ${errorMessage}`);

      // Retry logic
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        const retry = window.confirm('Network error. Retry closing positions?');
        if (retry) {
          setTimeout(() => handleCloseAll(), 1000);
        }
      }
    }
  };

  const handleClosePosition = async (sym: string) => {
    try {
      const result = await ipc.trade.closePosition(sym);
      if (result.success) {
        await loadPositions();
        await loadBalance();
        toast.success(`Position ${sym} closed`);
      } else {
        const errorMsg = result?.error || 'Unknown error';
        toast.error(`Failed to close position: ${errorMsg}`);

        // Retry logic for network errors
        if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          const retry = window.confirm(`Retry closing position ${sym}?`);
          if (retry) {
            setTimeout(() => {
              handleClosePosition(sym).catch(console.error);
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Failed to close position:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to close position: ${errorMessage}`);

      // Retry logic for network errors
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      ) {
        const retry = window.confirm(`Network error. Retry closing position ${sym}?`);
        if (retry) {
          setTimeout(() => {
            handleClosePosition(sym).catch(console.error);
          }, 1000);
        }
      }
    }
  };

  // Update price when symbol changes
  useEffect(() => {
    loadQuote();
  }, [symbol]);

  return (
    <div className="mode-theme mode-theme--trade h-full w-full overflow-hidden">
      <div className="h-full w-full p-4 space-y-4 overflow-y-auto">
        {/* Dashboard */}
        <TradeDashboard
          marketSnapshots={marketSnapshots}
          riskMetrics={riskMetrics}
          onSymbolClick={handleSymbolSelect}
        />

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
            <TradingViewChart
              symbol={symbol}
              timeframe={timeframe}
              data={chartData}
              height={600}
              indicatorConfig={indicatorConfig}
            />
            <IndicatorsPanel
              indicators={indicatorConfig}
              onToggle={handleToggleIndicator}
              onUpdate={handleUpdateIndicator}
            />

            {/* Positions and Order Blotter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Open Positions */}
              <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
                <h3 className="font-semibold text-sm mb-3">Open Positions</h3>
                {openPositions.length === 0 ? (
                  <div className="text-sm text-neutral-400">No open positions</div>
                ) : (
                  <div className="space-y-2">
                    {openPositions.map(pos => (
                      <div
                        key={pos.symbol}
                        className="flex items-center justify-between p-2 bg-neutral-900 rounded text-sm"
                      >
                        <span className="font-semibold">{pos.symbol}</span>
                        <span
                          className={pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}
                        >
                          ${pos.unrealizedPnL.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Blotter */}
              <OrderBlotter showPaperOnly={true} />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Watchlist activeSymbol={symbol} onSelectSymbol={handleSymbolSelect} />
            <SymbolSearch
              activeSymbol={symbol}
              recentSymbols={recentSymbols}
              onSelect={handleSymbolSelect}
            />

            {/* Order Entry */}
            <OrderEntry
              symbol={symbol}
              currentPrice={currentPrice}
              atr={atr}
              onSubmit={handleOrderSubmit}
              preset={riskPreset ?? undefined}
              aiSuggestion={
                aiSignal && (aiSignal.action === 'buy' || aiSignal.action === 'sell')
                  ? {
                      action: aiSignal.action as 'buy' | 'sell',
                      price: aiSignal.entryPrice,
                      confidence: aiSignal.confidence ?? 0,
                      stopLoss: aiSignal.stopLoss,
                      takeProfit: aiSignal.takeProfit,
                    }
                  : undefined
              }
            />

            <RiskManager
              symbol={symbol}
              currentPrice={currentPrice}
              atr={atr}
              portfolioValue={balance.portfolioValue}
              balance={balance}
              riskMetrics={riskMetrics}
              openPositions={openPositions}
              onApplyPlan={handleRiskPlanApply}
            />

            {/* AI Signal Panel */}
            <AISignalPanel
              symbol={symbol}
              signal={aiSignal}
              onApplySignal={handleApplySignal}
              onGenerateSignal={generateAISignal}
              isLoading={isGeneratingSignal}
            />

            {/* Safe Exit Controls */}
            <SafeExitControls
              config={safeExitConfig}
              onConfigChange={setSafeExitConfig}
              onKillSwitch={handleKillSwitch}
              onCloseAll={handleCloseAll}
              onClosePosition={handleClosePosition}
              openPositions={openPositions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
