# Trade Mode - Mock Realtime Server Setup

This guide will help you set up and run the mock realtime server for testing Trade Mode with live data.

## Quick Start

### 1. Install Server Dependencies

```bash
cd server
npm install
```

This will install:

- `express` - HTTP server
- `ws` - WebSocket server
- `cors` - CORS middleware
- `body-parser` - Request body parsing

### 2. Start the Mock Realtime Server

```bash
# From server directory
npm start

# Or from project root
npm run dev:realtime-server
```

The server will start on `http://localhost:4001` and `ws://localhost:4001`.

### 3. Start Your Frontend

In a separate terminal:

```bash
npm run dev:web
```

### 4. Open Trade Mode

Navigate to Trade Mode in your browser. You should see:

- ✅ Chart loading with historical candles
- ✅ Real-time price updates (green "● Live" indicator)
- ✅ Order book updating with bids/asks
- ✅ Recent trades scrolling
- ✅ Order placement working

## What the Mock Server Provides

### WebSocket Events

- `snapshot` - Initial data when client connects (price, orderbook, candles)
- `tick` - Real-time price updates (~1.25 ticks/second)
- `candle` - New candle when minute boundary is crossed
- `orderbook` - Order book updates (every 5 ticks)
- `order_executed` - Order fill notifications

### REST API Endpoints

- `GET /api/health` - Server health check
- `GET /api/candles/:symbol` - Historical candle data
- `POST /api/orders` - Place an order (simulated matching)

## Testing Order Placement

1. Enter quantity, select order type (Market/Limit), set price
2. Click BUY or SELL
3. Confirm order in modal
4. Watch for order execution notification
5. See trade appear in trades tape

## Troubleshooting

### Server won't start

```bash
# Check if port 4001 is already in use
netstat -ano | findstr :4001

# Or try a different port
PORT=4002 node server/realtime-server.js
```

### WebSocket not connecting

1. Check browser console for WebSocket errors
2. Verify server is running: `curl http://localhost:4001/api/health`
3. Check `VITE_WS_HOST` in `.env` (should be `localhost:4001`)

### Chart not updating

1. Check browser console for WebSocket messages
2. Verify `wsConnected` state shows `true` in React DevTools
3. Check Network tab → WS → Messages for incoming data

## Next Steps

Once the mock server is working:

1. **Replace with real exchange feed** - Connect to actual market data provider
2. **Add order persistence** - Store orders in database
3. **Implement matching engine** - Real order matching logic
4. **Add user accounts** - Balance tracking, risk limits
5. **Add order history** - View past orders and fills

## Environment Variables

Add to `.env`:

```bash
# Mock server (default)
VITE_API_BASE_URL=http://localhost:4001
VITE_WS_HOST=localhost:4001

# Or use production server
# VITE_API_BASE_URL=https://api.yourdomain.com
# VITE_WS_HOST=wss://api.yourdomain.com
```

## Scripts

- `npm run dev:realtime-server` - Start mock server only
- `npm run dev:trade` - Start mock server + frontend together
