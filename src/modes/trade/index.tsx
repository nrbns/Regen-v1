import { useState } from 'react';
import { MockBroker } from './adapters';

type Chart = { id: string; symbol: string; timeframe: string };

export default function TradePanel() {
  const broker = new MockBroker();
  const [balance, setBalance] = useState(broker.getBalance());
  const [charts, setCharts] = useState<Chart[]>([
    { id: cryptoRandom(), symbol: 'AAPL', timeframe: '60' }
  ]);
  const [symbol, setSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('60');

  const addChart = () => setCharts((c)=> [...c, { id: cryptoRandom(), symbol, timeframe }]);
  const removeChart = (id: string) => setCharts((c)=> c.filter(x=> x.id !== id));
  const layoutCols = charts.length >= 4 ? 2 : charts.length >= 2 ? 2 : 1;

  return (
    <div className="h-full w-full p-3 space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <div>Paper Balance: ${balance.toFixed(2)}</div>
        <button className="bg-green-600 text-white px-2 py-1 rounded" onClick={()=>{ broker.buy(symbol, 1); setBalance(broker.getBalance()); }}>Buy 1</button>
        <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={()=>{ broker.sell(symbol, 1); setBalance(broker.getBalance()); }}>Sell 1</button>
        <div className="ml-auto flex items-center gap-2">
          <input className="bg-neutral-800 rounded px-2 py-1" value={symbol} onChange={(e)=>setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
          <select className="bg-neutral-800 rounded px-2 py-1" value={timeframe} onChange={(e)=>setTimeframe(e.target.value)}>
            <option value="1">1m</option>
            <option value="5">5m</option>
            <option value="15">15m</option>
            <option value="60">1h</option>
            <option value="240">4h</option>
            <option value="1D">1D</option>
          </select>
          <button className="bg-indigo-600 text-white px-2 py-1 rounded" onClick={addChart}>Add Chart</button>
        </div>
      </div>
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${layoutCols}, minmax(0, 1fr))` }}>
        {charts.map(c => (
          <div key={c.id} className="relative bg-neutral-800 rounded overflow-hidden">
            <button className="absolute right-2 top-2 text-xs bg-neutral-900/70 px-2 py-1 rounded" onClick={()=>removeChart(c.id)}>Close</button>
            <TradingView symbol={c.symbol} timeframe={c.timeframe} />
          </div>
        ))}
      </div>
      <AiAssistant symbol={symbol} />
    </div>
  );
}

function TradingView({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const src = getTradingViewEmbed(symbol, timeframe);
  return (
    <iframe className="w-full h-[380px]" src={src} title={`TV-${symbol}`} referrerPolicy="no-referrer" />
  );
}

function getTradingViewEmbed(symbol: string, timeframe: string) {
  const sym = encodeURIComponent(symbol);
  const interval = encodeURIComponent(timeframe);
  return `https://s.tradingview.com/widgetembed/?frameElementId=tv_embed&symbol=${sym}&interval=${interval}&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=rgba(0,0,0,1)&studies=[]&hideideas=1&theme=dark`;
}

function cryptoRandom() { return Math.random().toString(36).slice(2); }

function AiAssistant({ symbol }: { symbol: string }) {
  return (
    <div className="border border-neutral-800 rounded p-3 text-sm">
      <div className="font-medium mb-1">AI Helper</div>
      <div className="text-neutral-300">Suggestions for {symbol}: Mock signals and notes. Connect your provider later.</div>
    </div>
  );
}


