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
    <div className="flex h-full w-full bg-slate-950">
      {/* Main Chart Panel */}
      <div className="flex-1 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-2 p-4 border-b border-slate-800">
          <BarChart3 size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Chart</h2>
        </div>
        <div className="flex-1 p-4">
          {/* TradingView or custom chart would go here */}
          <div className="h-full rounded-lg border border-slate-800 bg-slate-900/50 flex items-center justify-center text-slate-400">
            Chart view (TradingView integration coming soon)
          </div>
        </div>
      </div>

      {/* Side Panels */}
      <div className="w-80 flex flex-col border-l border-slate-800">
        {/* Panel Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActivePanel('news')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activePanel === 'news'
                ? 'text-purple-300 border-b-2 border-purple-500 bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper size={16} className="inline mr-2" />
            News
          </button>
          <button
            onClick={() => setActivePanel('agent')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activePanel === 'agent'
                ? 'text-purple-300 border-b-2 border-purple-500 bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={16} className="inline mr-2" />
            Agent
          </button>
        </div>

        {/* News Panel */}
        {activePanel === 'news' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {/* News items would go here */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                <p className="text-sm text-slate-300">Market news feed coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Panel */}
        {activePanel === 'agent' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                <p className="text-sm text-slate-300 mb-2">Ask OmniAgent:</p>
                <ul className="text-xs text-slate-400 space-y-1">
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
