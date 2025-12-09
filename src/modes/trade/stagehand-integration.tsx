/**
 * Stagehand Integration for Trade Mode
 * Adds developer-friendly scripting API
 */

import { useEffect } from 'react';
import { useStagehand } from '../../hooks/useStagehand';

export function TradeStagehandIntegration() {
  const { stagehand, execute, click, type, extract } = useStagehand({
    context: 'trade',
  });

  useEffect(() => {
    // Expose Stagehand API to window for console access
    if (typeof window !== 'undefined') {
      (window as any).tradeStagehand = {
        stagehand,
        execute,
        click,
        type,
        extract,
        // Trade-specific helpers
        placeOrder: async (side: 'buy' | 'sell', quantity: number, price?: number) => {
          await click(`button[data-side="${side}"]`);
          await type('input[name="quantity"]', quantity.toString());
          if (price) {
            await type('input[name="price"]', price.toString());
          }
          await click('button[type="submit"]');
        },
        getPrice: async () => {
          const price = await extract('.price-display');
          return parseFloat(price);
        },
        getOrderbook: async () => {
          const bids = await extract('.orderbook-bids');
          const asks = await extract('.orderbook-asks');
          return { bids, asks };
        },
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).tradeStagehand;
      }
    };
  }, [stagehand, execute, click, type, extract]);

  return null; // This is a side-effect component
}








