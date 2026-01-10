import React from 'react';
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags';

// Minimal v1-safe Trade panel. Heavy trading UI and real-time integrations are
// deliberately disabled in v1 to reduce attack surface and external dependencies.
export default function TradePanel(): JSX.Element | null {
  if (isV1ModeEnabled()) {
  return (
    <div className="p-4 text-sm text-slate-300">
      Trade mode is disabled in v1. Experimental trading features are deferred to ROADMAP.md.
    </div>
    );
}

  // For non-v1 mode, return null to indicate this feature is not yet implemented
  return (
    <div className="p-4 text-sm text-slate-300">
      Trade mode is currently under development. Please check back later.
    </div>
  );
}