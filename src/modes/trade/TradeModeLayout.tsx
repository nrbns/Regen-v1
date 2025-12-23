/**
 * Trade Mode Layout - Tier 3 Pillar 2
 * Multi-panel layout for trading workflows
 */

import { useState } from 'react';
import { Newspaper, Sparkles, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../state/appStore';

export function TradeModeLayout() {
  const [activePanel, setActivePanel] = useState<'chart' | 'news' | 'agent'>('chart');
  const mode = useAppStore(state => state.mode);

  if (mode !== 'Trade') {
    return null;
  }

  return (
    <div className="flex h-full w-full bg-slate-950 transition-all duration-300 will-change-transform">
      {/* Main Chart Panel */}
      <div className="flex flex-1 flex-col border-r border-slate-800 transition-all duration-300 will-change-transform">
        <div className="flex items-center gap-2 border-b border-slate-800 p-4">
          <BarChart3 size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Chart</h2>
        </div>
        <div className="flex-1 p-4">
          {/* TradingView or custom chart would go here */}
          <div className="animate-fade-in flex h-full items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 transition-all duration-300 will-change-transform">
            Chart view (TradingView integration coming soon)
          </div>
        </div>
      </div>

      {/* Side Panels */}
      <div className="flex w-80 flex-col border-l border-slate-800 transition-all duration-300 will-change-transform">
        {/* Panel Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActivePanel('news')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors will-change-transform ${
              activePanel === 'news'
                ? 'border-b-2 border-purple-500 bg-slate-900 text-purple-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper size={16} className="mr-2 inline" />
            News
          </button>
          <button
            onClick={() => setActivePanel('agent')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors will-change-transform ${
              activePanel === 'agent'
                ? 'border-b-2 border-purple-500 bg-slate-900 text-purple-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={16} className="mr-2 inline" />
            Agent
          </button>
        </div>

        {/* News Panel */}
        {activePanel === 'news' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* News items would go here */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-sm text-slate-300">Market news feed coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Panel */}
        {activePanel === 'agent' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <p className="mb-2 text-sm text-slate-300">Ask OmniAgent:</p>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• "Explain today's move for BTC"</li>
                  <li>• "Summarize key macro news"</li>
                  <li>• "What's the sentiment on this symbol?"</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
