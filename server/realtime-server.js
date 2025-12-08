// server/realtime-server.js
// Mock realtime trading server for Trade Mode testing
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4001;

// --- in-memory state (simple) ---
let lastPrice = 25035.14;
let symbol = 'NIFTY50';
let seq = 0;
let bids = [];
let asks = [];
let trades = [];

// init orderbook with synthetic rows
function seedOrderbook() {
  bids = [];
  asks = [];
  const mid = Math.round(lastPrice);
  for (let i = 0; i < 10; i++) {
    bids.push({ price: mid - (i + 1) * 5, size: Math.floor(200 + Math.random() * 500) });
    asks.push({ price: mid + (i + 1) * 5, size: Math.floor(200 + Math.random() * 500) });
  }
}
seedOrderbook();

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

// basic candle bucket (1-minute) aggregator for demo
let currentCandle = null;
function updateCandle(price, ts = Date.now()) {
  const minute = Math.floor(ts / 60000) * 60000;
  if (!currentCandle || currentCandle.time !== minute) {
    if (currentCandle) broadcast({ type: 'candle', candle: currentCandle });
    currentCandle = {
      time: minute,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: Math.floor(Math.random() * 100),
    };
  } else {
    currentCandle.high = Math.max(currentCandle.high, price);
    currentCandle.low = Math.min(currentCandle.low, price);
    currentCandle.close = price;
    currentCandle.volume += Math.floor(Math.random() * 10);
  }
}

// simulated price tick generator
function tick() {
  // small random walk
  const change = (Math.random() - 0.48) * (Math.random() * 4);
  lastPrice = Math.max(100, +(lastPrice + change).toFixed(2));
  seq++;

  // occasionally adjust book
  if (Math.random() > 0.7) {
    const idx = Math.floor(Math.random() * bids.length);
    bids[idx].size = Math.max(1, bids[idx].size + Math.floor((Math.random() - 0.5) * 100));
  }

  // generate a trade
  const trade = {
    id: `trade_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    seq,
    price: lastPrice,
    size: Math.floor(1 + Math.random() * 20),
    ts: Date.now(),
    side: Math.random() > 0.5 ? 'buy' : 'sell',
  };
  trades.push(trade);
  if (trades.length > 200) trades.shift();

  updateCandle(lastPrice);
  broadcast({ type: 'tick', symbol, seq, price: lastPrice, trade });
  // orderbook snapshot every few ticks
  if (seq % 5 === 0) broadcast({ type: 'orderbook', bids, asks });
}

// broadcast a 10-candle history on new WS connection or REST
function candleHistory() {
  const now = Math.floor(Date.now() / 60000) * 60000;
  const hist = [];
  let p = lastPrice;
  for (let i = 30; i >= 1; i--) {
    const t = now - i * 60000;
    const o = +(p + (Math.random() - 0.5) * 4).toFixed(2);
    const c = +(o + (Math.random() - 0.5) * 4).toFixed(2);
    const h = Math.max(o, c) + Math.random() * 2;
    const l = Math.min(o, c) - Math.random() * 2;
    hist.push({
      time: t,
      open: o,
      high: +h.toFixed(2),
      low: +l.toFixed(2),
      close: c,
      volume: Math.floor(Math.random() * 100),
    });
    p = c;
  }
  return hist;
}

// REST endpoints
app.get('/api/health', (req, res) => res.json({ ok: true, symbol, lastPrice }));

app.get('/api/candles/:symbol', (req, res) => {
  return res.json({ candles: candleHistory() });
});

// create order endpoint: simulate immediate fill or partial
app.post('/api/orders', (req, res) => {
  const { symbol: s, side, qty, price, type: _type = 'limit' } = req.body;
  if (!s || !side || !qty) return res.status(400).json({ error: 'missing_fields' });

  // simple match: if limit and price crosses book, fill; if market fill immediately
  let filled = 0;
  const id = 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  // simulate matching: 70% chance immediate fill
  const rand = Math.random();
  if (rand > 0.3) {
    filled = qty;
  } else {
    filled = Math.floor(qty * (0.3 + Math.random() * 0.5));
  }

  // push trade(s) and update lastPrice
  const trade = {
    id,
    symbol: s,
    price: price || lastPrice,
    size: filled,
    side,
    ts: Date.now(),
  };
  lastPrice = trade.price;
  trades.push(trade);
  updateCandle(lastPrice);
  broadcast({ type: 'order_executed', orderId: id, symbol: s, side, qty, filled, trade });

  return res.json({ ok: true, orderId: id, filled });
});

// ws connections
wss.on('connection', (ws, _req) => {
  // send basic snapshot
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      symbol,
      lastPrice,
      orderbook: { bids, asks },
      candles: candleHistory().slice(-60),
    })
  );

  // optional: parse subscribe messages
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg.toString());
      if (data?.type === 'subscribe' && data.symbol) {
        // reply with a small snapshot for that symbol
        ws.send(
          JSON.stringify({
            type: 'subscribed',
            symbol: data.symbol,
            lastPrice,
            orderbook: { bids, asks },
          })
        );
      }
    } catch {
      // ignore parse errors
    }
  });
});

// start generator
setInterval(tick, 800); // ~1.25 ticks/sec

server.listen(PORT, () => {
  console.log(`[Realtime Server] Mock realtime server running on port ${PORT}`);
  console.log(`[Realtime Server] WebSocket: ws://localhost:${PORT}`);
  console.log(`[Realtime Server] REST API: http://localhost:${PORT}/api/*`);
});
