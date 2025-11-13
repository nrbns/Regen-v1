import { useState, useEffect } from 'react';
import TradeDashboard, { MarketSnapshot, RiskMetrics } from '../../components/trade/TradeDashboard';
import TradingChart, { CandleData } from '../../components/trade/TradingChart';
import OrderEntry, { OrderRequest } from '../../components/trade/OrderEntry';
import AISignalPanel, { AISignal } from '../../components/trade/AISignalPanel';
import SafeExitControls, { SafeExitConfig } from '../../components/trade/SafeExitControls';
import OrderBlotter from '../../components/trade/OrderBlotter';
import { ipc } from '../../lib/ipc-typed';

export default function TradePanel() {
  const [, setBalance] = useState({ cash: 100000, buyingPower: 200000, portfolioValue: 100000 });
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('60');
  const [currentPrice, setCurrentPrice] = useState(150.0);
  const [atr] = useState(1.2);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [, setIsLoadingChart] = useState(false);

  // Market snapshots (will be updated from real data)
  const [marketSnapshots, setMarketSnapshots] = useState<MarketSnapshot[]>([
    { symbol: 'AAPL', price: 150.25, change: 2.5, changePercent: 1.69, volume: 1250000 },
    { symbol: 'MSFT', price: 380.50, change: -1.2, changePercent: -0.31, volume: 890000 },
    { symbol: 'GOOGL', price: 142.30, change: 0.8, changePercent: 0.56, volume: 2100000 },
    { symbol: 'TSLA', price: 245.75, change: -5.2, changePercent: -2.07, volume: 3200000 },
  ]);

  // Risk metrics (will be calculated from real positions)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    totalExposure: 50000,
    dailyPnL: 1250.50,
    marginUsed: 15000,
    marginAvailable: 35000,
    worstOpenTrade: -350.00,
    maxDrawdown: 2.5,
    portfolioValue: 100000,
    riskScore: 45,
  });

  // Positions
  const [openPositions, setOpenPositions] = useState<Array<{ symbol: string; unrealizedPnL: number }>>([]);

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

  const loadBalance = async () => {
    try {
      const balanceData = await ipc.trade.getBalance();
      setBalance(balanceData);
      // Update risk metrics with real balance
      setRiskMetrics((prev) => ({
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
      const positionsList = positions.map((pos) => ({
        symbol: pos.symbol,
        unrealizedPnL: pos.unrealizedPnL,
      }));
      setOpenPositions(positionsList);

      // Calculate risk metrics from positions
      const totalExposure = positions.reduce((sum, pos) => sum + pos.quantity * pos.currentPrice, 0);
      const dailyPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL + pos.realizedPnL, 0);
      const worstTrade = positions.reduce(
        (worst, pos) => (pos.unrealizedPnL < worst ? pos.unrealizedPnL : worst),
        0
      );

      setRiskMetrics((prev) => ({
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
      setMarketSnapshots((prev) =>
        prev.map((snap) =>
          snap.symbol === symbol
            ? {
                ...snap,
                price: quote.last,
                change: quote.last - (snap.price - snap.change),
                changePercent: ((quote.last - (snap.price - snap.change)) / (snap.price - snap.change)) * 100,
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
      const quotes = await Promise.all(symbols.map((sym) => ipc.trade.getQuote(sym).catch(() => null)));
      setMarketSnapshots((prev) =>
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

  // Generate mock AI signal
  const generateAISignal = async (sym: string) => {
    setIsGeneratingSignal(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

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
        bracket: order.bracket && order.bracket.stopLoss !== undefined && order.bracket.takeProfit !== undefined
          ? { stopLoss: order.bracket.stopLoss, takeProfit: order.bracket.takeProfit, stopLossType: order.bracket.stopLossType, takeProfitType: order.bracket.takeProfitType }
          : undefined,
        trailingStop: order.trailingStop,
        paper: order.paper ?? true,
        aiSignalId: aiSignal?.id,
      });

      // Reload balance and positions
      await loadBalance();
      await loadPositions();

      // Show success notification
      alert(`Order placed: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}${order.paper ? ' (Paper)' : ''}`);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle AI signal application
  const handleApplySignal = (signal: AISignal) => {
    // Auto-fill order entry with signal data
    setCurrentPrice(signal.entryPrice);
    // Trigger order entry update (would need state management for this)
    console.log('Applying signal:', signal);
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
      alert('All positions closed');
    } catch (error) {
      console.error('Failed to close all positions:', error);
      alert('Failed to close all positions');
    }
  };

  const handleClosePosition = async (sym: string) => {
    try {
      const result = await ipc.trade.closePosition(sym);
      if (result.success) {
        await loadPositions();
        await loadBalance();
        alert(`Position ${sym} closed`);
      } else {
        alert(`Failed to close position: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to close position:', error);
      alert(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update price when symbol changes
  useEffect(() => {
    loadQuote();
  }, [symbol]);

  return (
    <div className="h-full w-full p-4 space-y-4 overflow-y-auto">
      {/* Dashboard */}
      <TradeDashboard
        marketSnapshots={marketSnapshots}
        riskMetrics={riskMetrics}
        onSymbolClick={(sym) => {
          setSymbol(sym);
          generateAISignal(sym);
        }}
      />

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <TradingChart
            symbol={symbol}
            timeframe={timeframe}
            data={chartData}
            onTimeframeChange={setTimeframe}
            height={600}
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
                  {openPositions.map((pos) => (
                    <div
                      key={pos.symbol}
                      className="flex items-center justify-between p-2 bg-neutral-900 rounded text-sm"
                    >
                      <span className="font-semibold">{pos.symbol}</span>
                      <span className={pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
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
          {/* Order Entry */}
          <OrderEntry
            symbol={symbol}
            currentPrice={currentPrice}
            atr={atr}
            onSubmit={handleOrderSubmit}
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
  );
}
