# TradingView REST API Integration

## Overview

The Trade Mode now supports TradingView's Broker REST API specification (v1.9.3) for professional trading integration. This allows you to connect to any broker that implements the TradingView API standard.

## Features

✅ **Authentication** - OAuth2 and Password Bearer authentication  
✅ **Real-time Quotes** - Live market data via `/quotes` endpoint  
✅ **Order Management** - Place, modify, and cancel orders  
✅ **Position Tracking** - Get open positions and account state  
✅ **Fallback Support** - Falls back to Yahoo Finance if TradingView API not configured

## Configuration

Add these to your `.env` file:

```env
# TradingView Broker REST API
TRADINGVIEW_API_BASE_URL=https://your-rest-implementation.com/api
TRADINGVIEW_ACCESS_TOKEN=your-access-token
TRADINGVIEW_ACCOUNT_ID=your-account-id
TRADINGVIEW_CLIENT_ID=your-client-id
TRADINGVIEW_CLIENT_SECRET=your-client-secret
```

## API Endpoints

### 1. Authentication

**Command:** `tradingview_authorize`

```typescript
await ipc.invoke('tradingview_authorize', {
  login: 'your-username',
  password: 'your-password',
});
```

**Response:**

```json
{
  "s": "ok",
  "d": {
    "access_token": "7133au-cba5a72-842029c",
    "expiration": 1548661401
  }
}
```

### 2. Get Quotes

**Command:** `tradingview_quotes`

```typescript
await ipc.invoke('tradingview_quotes', {
  accountId: 'your-account-id',
  symbols: 'EURUSD,GBPUSD',
});
```

**Response:**

```json
{
  "s": "ok",
  "d": [
    {
      "n": "EURUSD",
      "v": {
        "bid": 1.1347,
        "ask": 1.1349,
        "last": 1.1348
      }
    }
  ]
}
```

### 3. Place Order

**Command:** `tradingview_place_order`

```typescript
await ipc.invoke('tradingview_place_order', {
  accountId: 'your-account-id',
  instrument: 'EURUSD',
  qty: 1,
  side: 'buy',
  orderType: 'limit',
  limitPrice: 1.135,
  currentAsk: 1.1349,
  currentBid: 1.1347,
  stopLoss: 1.13,
  takeProfit: 1.14,
});
```

**Response:**

```json
{
  "s": "ok",
  "d": {
    "orderId": "441fdB023",
    "transactionId": "1adf4578-cdf"
  }
}
```

### 4. Get Positions

**Command:** `tradingview_get_positions`

```typescript
await ipc.invoke('tradingview_get_positions', {
  accountId: 'your-account-id',
});
```

**Response:**

```json
{
  "s": "ok",
  "d": [
    {
      "id": "p1",
      "instrument": "EURUSD",
      "qty": 1,
      "side": "buy",
      "avgPrice": 1.1347,
      "unrealizedPl": 19.47
    }
  ]
}
```

### 5. Get Account State

**Command:** `tradingview_get_account_state`

```typescript
await ipc.invoke('tradingview_get_account_state', {
  accountId: 'your-account-id',
});
```

**Response:**

```json
{
  "s": "ok",
  "d": {
    "balance": 41757.91,
    "unrealizedPl": 1053.02,
    "equity": 42857.56
  }
}
```

## Automatic Fallback

The `trade_api` command automatically tries TradingView first, then falls back to Yahoo Finance:

1. **TradingView** (if configured):
   - Checks for `TRADINGVIEW_API_BASE_URL` and `TRADINGVIEW_ACCESS_TOKEN`
   - Uses `/quotes` endpoint for real-time prices
   - Returns broker-specific data

2. **Yahoo Finance** (fallback):
   - Used if TradingView not configured or fails
   - Free, no API key needed
   - Limited to public market data

## Usage Example

```typescript
// In your trade mode component
import { ipc } from '../lib/ipc-typed';

// Authenticate
const authResult = await ipc.invoke('tradingview_authorize', {
  login: 'username',
  password: 'password',
});

// Store access token in .env or secure storage
// TRADINGVIEW_ACCESS_TOKEN=authResult.d.access_token

// Get quotes
const quotes = await ipc.invoke('tradingview_quotes', {
  accountId: 'account-123',
  symbols: 'NIFTY,BANKNIFTY',
});

// Place order
const order = await ipc.invoke('tradingview_place_order', {
  accountId: 'account-123',
  instrument: 'NIFTY',
  qty: 50,
  side: 'buy',
  orderType: 'market',
  currentAsk: 25035.0,
  currentBid: 25034.0,
});
```

## Supported Order Types

- **market** - Market order (executed immediately at current price)
- **limit** - Limit order (executed at specified price or better)
- **stop** - Stop order (becomes market order when price reached)
- **stoplimit** - Stop limit order (becomes limit order when price reached)

## Supported Features

✅ Market, Limit, Stop, StopLimit orders  
✅ Stop Loss and Take Profit brackets  
✅ Position management  
✅ Account balance and equity  
✅ Real-time quotes streaming  
✅ OAuth2 and Password authentication

## Broker Compatibility

This integration works with any broker that implements the TradingView Broker REST API specification, including:

- Most major forex brokers
- CFD providers
- Crypto exchanges (if they support TradingView API)
- Stock brokers with TradingView integration

## Security Notes

1. **Never commit API keys** - Keep them in `.env` file (already in `.gitignore`)
2. **Use OAuth2** - More secure than password authentication
3. **Token expiration** - Access tokens expire; implement refresh logic
4. **HTTPS only** - Always use HTTPS for API calls in production

## Testing

```bash
# Test with TradingView API
TRADINGVIEW_API_BASE_URL=https://your-broker.com/api \
TRADINGVIEW_ACCESS_TOKEN=your-token \
TRADINGVIEW_ACCOUNT_ID=your-account \
cargo tauri dev

# Test fallback (no TradingView config)
cargo tauri dev
# → Will use Yahoo Finance
```

## Documentation

Full TradingView REST API specification:  
https://www.tradingview.com/rest-api-docs/

## Status

✅ **All core endpoints implemented!**

- ✅ Authentication
- ✅ Quotes
- ✅ Place Order
- ✅ Get Positions
- ✅ Get Account State
- ✅ Automatic fallback to Yahoo Finance

Ready for production use! 🚀
