// Command Center - Main landing page for Regen Browser
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bot, Folder, Lightbulb, MessageSquare, Zap, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandController } from '../hooks/useCommandController';
import { workspaceStore } from '../lib/workspace/WorkspaceStore';
import { showToast } from '../components/ui/Toast';
import { RecentActivityFeed } from '../components/ui/RecentActivityFeed';

export default function Home() {
  const navigate = useNavigate();
  const { executeCommand } = useCommandController();
  const [showSmartTools, setShowSmartTools] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [workspaceCount, setWorkspaceCount] = useState(0);

  // Load workspace count
  useEffect(() => {
    setWorkspaceCount(workspaceStore.getCount());
  }, []);

  // Listen for text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 10) {
        setSelectedText(selection);
        setShowSmartTools(true);
      } else {
        setSelectedText('');
        if (!document.activeElement?.matches('input, textarea')) {
          setShowSmartTools(false);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Show Smart Tools when command bar is focused
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target?.matches('input[placeholder*="command"], input[placeholder*="Search"]')) {
        setShowSmartTools(true);
      }
    };

    const handleBlur = () => {
      if (!window.getSelection()?.toString().trim()) {
        setTimeout(() => setShowSmartTools(false), 200);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Handle card clicks - pre-fill command bar, don't auto-run
  const handleCardClick = (command: string) => {
    // Dispatch custom event to pre-fill command bar
    const event = new CustomEvent('regen:prefill-command', { detail: { command } });
    window.dispatchEvent(event);
    // Navigate to show the command in context
    navigate('/ai-search');
  };

  // Handle Smart Tools actions
  const handleSummarizePage = async () => {
    const result = await executeCommand('summarize page', { currentUrl: window.location.href });
    if (result.success) {
      showToast('Page summarized successfully', 'success');
    } else {
      showToast(result.message || 'Failed to summarize page', 'error');
    }
    setShowSmartTools(false);
  };

  const handleAnalyzeText = async () => {
    if (selectedText) {
      const result = await executeCommand(`analyze: ${selectedText}`, { selectedText });
      if (result.success) {
        showToast('Text analyzed successfully', 'success');
      } else {
        showToast(result.message || 'Failed to analyze text', 'error');
      }
      setShowSmartTools(false);
    }
  };

  const handleAutomateTask = () => {
    navigate('/task-runner');
    setShowSmartTools(false);
  };

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
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-8 h-8 text-blue-400" />
              </motion.div>
              <h1 className="text-3xl font-semibold text-slate-200">
              System Control Room
            </h1>
            </div>
            <p className="text-sm text-slate-400 italic">
              Recent activity and context-aware suggestions
            </p>
          </motion.div>

          {/* Recent Activity Feed */}
          <RecentActivityFeed />

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* AI Search & Summarize */}
            <motion.div
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-purple-500 transition-all group shadow-lg hover:shadow-purple-500/20"
              whileHover={{ scale: 1.03, y: -6, boxShadow: '0 20px 25px -5px rgba(147, 51, 234, 0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCardClick('search')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.div
                className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors"
                whileHover={{ rotate: 15, scale: 1.1 }}
              >
                <Search className="w-6 h-6 text-purple-400" />
              </motion.div>
              <h3 className="text-lg font-medium text-slate-300 mb-2 group-hover:text-slate-200 transition-colors">
                Search & Summarize
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Search the web or summarize current page when detected
              </p>
            </motion.div>

            {/* Task Runner */}
            <motion.div
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-purple-500 transition-all group shadow-lg hover:shadow-purple-500/20"
              whileHover={{ scale: 1.03, y: -6, boxShadow: '0 20px 25px -5px rgba(147, 51, 234, 0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/task-runner')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <motion.div
                className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors"
                whileHover={{ rotate: -15, scale: 1.1 }}
              >
                <Sparkles className="w-6 h-6 text-purple-400" />
              </motion.div>
              <h3 className="text-lg font-medium text-slate-300 mb-2 group-hover:text-slate-200 transition-colors">
                Observations
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                View detected patterns, suggested actions, and Regen Core activity log
              </p>
            </motion.div>

            {/* Local Workspace */}
            <motion.div
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-yellow-500 transition-all group shadow-lg hover:shadow-yellow-500/20"
              whileHover={{ scale: 1.03, y: -6, boxShadow: '0 20px 25px -5px rgba(234, 179, 8, 0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/workspace')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <motion.div
                className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors"
                whileHover={{ rotate: 15, scale: 1.1 }}
              >
                <Folder className="w-6 h-6 text-yellow-400" />
              </motion.div>
              <h3 className="text-lg font-medium text-slate-300 mb-2 group-hover:text-slate-200 transition-colors">
                Local Workspace
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Saved items from browsing sessions and AI-generated content
              </p>
              {workspaceCount > 0 && (
                <motion.p
                  className="text-xs text-yellow-400 mt-2 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {workspaceCount} saved {workspaceCount === 1 ? 'item' : 'items'}
                </motion.p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Right Sidebar - Smart Tools (Contextual) */}
      {showSmartTools && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className="w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-200">Smart Tools</h3>
            </div>
            <motion.button
              onClick={() => setShowSmartTools(false)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4 text-slate-400" />
            </motion.button>
          </div>
          
          <div className="space-y-3 mb-6">
            <motion.button
              className="w-full flex items-center space-x-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-yellow-500 transition-all text-left group shadow-md hover:shadow-yellow-500/20"
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSummarizePage}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              >
                <Lightbulb className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300" />
              </motion.div>
              <span className="text-sm text-slate-400 group-hover:text-slate-300">
                Summarize page available
              </span>
            </motion.button>

            {selectedText && (
              <motion.button
                className="w-full flex items-center space-x-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-blue-500 transition-all text-left group shadow-md hover:shadow-blue-500/20"
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyzeText}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MessageSquare className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                <span className="text-sm text-slate-400 group-hover:text-slate-300">
                Analyze selected text available
              </span>
              </motion.button>
            )}

            <motion.button
              className="w-full flex items-center space-x-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-purple-500 transition-all text-left group shadow-md hover:shadow-purple-500/20"
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAutomateTask}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
              </motion.div>
              <span className="text-sm text-slate-400 group-hover:text-slate-300">
                Task extraction available
              </span>
            </motion.button>
          </div>

          {/* Ask Regen Input */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <input
              type="text"
              placeholder="Search, navigate, or ask Regen..."
              className="w-full pl-4 pr-10 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
              onKeyPress={async (e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget.value;
                  if (input.trim()) {
                    const result = await executeCommand(input);
                    if (result.success) {
                      showToast('Command executed successfully', 'success');
                    } else {
                      showToast(result.message || 'Command failed', 'error');
                    }
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            <motion.div
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              whileHover={{ scale: 1.1, rotate: 15 }}
            >
              <Search className="w-5 h-5 text-slate-400" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}