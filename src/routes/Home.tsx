// Control Room - Live status view for Regen Browser
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Folder, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandController } from '../hooks/useCommandController';
import { workspaceStore } from '../lib/workspace/WorkspaceStore';
import { RecentActivityFeed } from '../components/ui/RecentActivityFeed';
import { useRegenCore } from '../core/regen-core/regenCore.store';

export default function Home() {
  const navigate = useNavigate();
  useCommandController(); // keep controller warm for command bar usage
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const { state: regenCoreState } = useRegenCore();

  // Load workspace count
  useEffect(() => {
    setWorkspaceCount(workspaceStore.getCount());
  }, []);

  const regenCoreStatusLine = useMemo(() => {
    switch (regenCoreState) {
      case 'observing':
        return 'Regen Core status: Observing';
      case 'aware':
        return 'Regen Core status: Aware';
      case 'noticing':
        return 'Regen Core status: Observation available';
      case 'executing':
        return 'Regen Core status: Executing';
      case 'reporting':
        return 'Regen Core status: Reporting';
      default:
        return 'Regen Core status: Observing';
    }
  }, [regenCoreState]);

  const criticalPatternsLine = useMemo(() => {
    return regenCoreState === 'observing' ? 'No critical patterns detected' : 'Pattern detected — details available';
  }, [regenCoreState]);

  return (
    <div className="h-full flex bg-slate-900 text-white">
      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <Sparkles className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-semibold text-slate-200">System Control Room</h1>
            </div>
            <p className="text-sm text-slate-400">Current system state</p>
            <div className="mt-3 text-sm text-slate-400 space-y-1">
              <div>• Browsing session active</div>
              <div>• {criticalPatternsLine}</div>
              <div>• {regenCoreStatusLine}</div>
            </div>
          </motion.div>

          {/* Recent Activity Feed */}
          <RecentActivityFeed />

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Search & Summarize (status summary) */}
            <motion.div
              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              <div className="w-11 h-11 bg-slate-700/40 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">Search & Summarize</h3>
              <p className="text-slate-500 text-sm leading-relaxed">No summarization needed at the moment</p>
              <button
                onClick={() => navigate('/ai-search')}
                className="mt-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                View history →
              </button>
            </motion.div>

            {/* Observations (status summary) */}
            <motion.div
              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              <div className="w-11 h-11 bg-slate-700/40 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">Observations</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {regenCoreState === 'observing'
                  ? 'No active observations at the moment'
                  : 'Observation available — review suggested action'}
              </p>
              <button
                onClick={() => navigate('/task-runner')}
                className="mt-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Open observation log →
              </button>
            </motion.div>

            {/* Local Workspace (status summary) */}
            <motion.div
              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            >
              <div className="w-11 h-11 bg-slate-700/40 rounded-lg flex items-center justify-center mb-4">
                <Folder className="w-5 h-5 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">Local Workspace</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {workspaceCount > 0
                  ? `${workspaceCount} item${workspaceCount === 1 ? '' : 's'} saved automatically this session`
                  : 'Regen saves things only when they matter'}
              </p>
              <button
                onClick={() => navigate('/workspace')}
                className="mt-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                View workspace →
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}