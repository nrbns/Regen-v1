import React from 'react';
import { TopBar } from '../../../ui/components/TopBar';

export default function TradeLayout(): JSX.Element {
  return (
    <div className="h-full w-full">
      <TopBar />
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Trade mode (stub)</h2>
          <p className="text-sm text-white/70 mt-2">Trading UI is disabled in v1-mode or not available in this build.</p>
        </div>
      </div>
    </div>
  );
}
