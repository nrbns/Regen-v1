/**
 * AI Panel Route
 * Dev route for testing the AI Bridge integration
 */

import React from 'react';
import { AIPanel } from '../components/AIPanel';

export default function AIPanelRoute() {
  // Get bridge URL and token from environment or localStorage
  const bridgeUrl = import.meta.env.VITE_AI_BRIDGE_URL || 'http://127.0.0.1:4300';
  const bridgeToken =
    import.meta.env.VITE_AI_BRIDGE_TOKEN ||
    localStorage.getItem('ai_bridge_token') ||
    'LOCAL_DEV_TOKEN';

  return (
    <div className="h-screen w-screen">
      <AIPanel bridgeUrl={bridgeUrl} bridgeToken={bridgeToken} />
    </div>
  );
}
