# Regen Modes - Research & Trade

## Overview

Regen now supports two modes with ChatGPT-style natural language interface:

- **Research Mode**: Multi-source search + deep analysis + auto-open sites
- **Trade Mode**: Natural language trading + automation (paper trading first)

## User Experience

### Simple Interface

Users see only:

- **Text input box**: "Ask anything..."
- **Mode toggles**: Research | Trade
- **Voice button**: 🎙️ for voice commands

**No JSON visible to users** - all complexity is handled internally.

---

## Research Mode

### Example Queries

1. **"Find 5 best brokers for intraday trading in India and give detailed pros/cons"**
   - Searches web for broker information
   - Opens 5 official broker websites automatically
   - Generates detailed comparison table
   - Shows pros/cons for each

2. **"Compare Zerodha, Upstox, Angel One for intraday trading"**
   - Searches each broker specifically
   - Opens their official sites
   - Extracts fees, features, reviews
   - Creates side-by-side comparison

### Flow

1. User types query → Frontend sends `{ mode: "research", message: "..." }`
2. Backend routes to Research handler
3. Research handler:
   - Calls n8n `multi_source_research` workflow
   - Extracts URLs from results
   - Auto-opens tabs via `openTab` commands
   - Generates summary with sources
4. User sees:
   - Streaming status: "🔍 Searching...", "📊 Analyzing...", "✅ Opened 5 tabs"
   - Detailed comparison card
   - Source links

---

## Trade Mode

### Example Queries

1. **"Buy 10 shares of TCS at market"**
   - Parses: symbol=TCS, quantity=10, type=market
   - Shows confirmation: "⚠️ You are about to BUY 10 TCS @ market. Confirm? (Yes/No)"
   - User types "Yes" → Places paper trade
   - User types "No" → Cancels

2. **"Set SL at 1% and target 3%"**
   - Parses: stopLoss=1%, target=3%
   - Updates current position settings
   - Confirms: "✅ Stop loss set at 1%, target at 3%"

3. **"If NIFTY breaks 22,000 with volume > 2x average, buy 5 shares"**
   - Creates automation rule
   - Stores condition + action
   - Confirms: "✅ Automation created. Will trigger when condition is met."

4. **"Stop all automations"**
   - Finds all active automations
   - Disables them
   - Confirms: "✅ Stopped 3 active automations"

### Flow

1. User types trade command → Frontend sends `{ mode: "trade", message: "..." }`
2. Backend routes to Trade handler
3. Trade handler:
   - Parses natural language (buy/sell, SL, target, automation)
   - For orders: Requires confirmation
   - For automations: Creates/stops rules
4. User sees:
   - Confirmation prompts for orders
   - Status updates for automations
   - Paper trading results

---

## Paper Trading (Safe Start)

All trades start as **paper trades** (virtual portfolio):

- No real money at risk
- Tracks virtual positions
- Tests strategies safely
- Later: Can connect to real broker APIs

### Paper Trade Storage

```typescript
interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled';
}
```

---

## Automation Engine

### Creating Automations

User: "If TCS falls 2%, exit position"

**Internal storage:**

```json
{
  "id": "auto_123",
  "symbol": "TCS",
  "condition": "price < entry_price * 0.98",
  "action": "SELL",
  "quantity": "all",
  "enabled": true
}
```

### Managing Automations

- **"List automations"** → Shows all active rules
- **"Stop automation auto_123"** → Disables specific rule
- **"Stop all automations"** → Disables all for user

---

## Backend Architecture

### Mode Routing

```typescript
// electron/services/regen/core.ts
export async function handleMessage(msg: RegenMessage): Promise<RegenResponse> {
  if (msg.mode === 'trade') {
    return await handleTradeQuery(msg);
  }
  // Default to research
  return await handleResearchQuery(msg);
}
```

### Research Tools

- `search_web(query)` → n8n research workflow
- `scrape_url(url)` → Extract content
- `open_tab(url)` → Auto-open sites
- `analyze_sources(data)` → Generate comparison

### Trade Tools

- `place_paper_trade(intent)` → Virtual order
- `create_automation(rule)` → Store automation
- `stop_automation(id)` → Disable rule
- `list_automations(userId)` → Get all rules

---

## Confirmation Layer (Critical for Trading)

**All real trades require explicit confirmation:**

1. User: "Buy 10 TCS"
2. Regen: "⚠️ You are about to BUY 10 TCS @ market. Confirm? (Yes/No)"
3. User: "Yes" → Trade executes
4. User: "No" → Trade cancelled

**This prevents accidental trades.**

---

## Future Enhancements

1. **Real Broker Integration**
   - Zerodha Kite API
   - Upstox API
   - Fyers API
   - Unified connector layer

2. **Advanced Automation**
   - Backtesting
   - Strategy builder
   - Risk management rules

3. **Enhanced Research**
   - Real-time data
   - Sentiment analysis
   - News aggregation

---

## Files

### Core

- `electron/services/regen/core.ts` - Main router
- `electron/services/regen/modes/research.ts` - Research handler
- `electron/services/regen/modes/trade.ts` - Trade handler

### Tools

- `electron/services/regen/tools/tradeTools.ts` - Paper trading + automation
- `electron/services/regen/tools/browserTools.ts` - Browser control
- `electron/services/regen/tools/n8nTools.ts` - n8n integration

### IPC

- `electron/services/regen/ipc.ts` - Main IPC handlers
- `electron/services/regen/ipc-trade.ts` - Trade-specific IPC

### UI

- `src/components/regen/RegenSidebar.tsx` - Main UI component

---

**Regen is now a complete ChatGPT-style interface for Research & Trading! 🚀**
