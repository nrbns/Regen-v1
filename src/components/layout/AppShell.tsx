import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Settings,
  Bot,
  Brain,
  Search,
  Folder,
  Globe,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Download,
  Camera,
  Plus,
  X,
  Sparkles,
  Rocket,
  FileText,
  Square,
  CheckCircle
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useCommandController } from '../../hooks/useCommandController';
import { ToastContainer, showToast } from '../ui/Toast';
import { AIStatusDot } from '../ui/AIStatusDot';
import RegenCore from '../../core/regen-core/RegenCore';
import { 
  useTabRedundancyDetection, 
  useSearchLoopDetection,
  useLongScrollDetection,
  useIdleDetection,
  useErrorDetection,
  useRegenCoreActions 
} from '../../core/regen-core/regenCore.hooks';
import { useScrollDetection } from '../../lib/events/useScrollDetection';
import { useActivityDetection } from '../../lib/events/useActivityDetection';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';
import { useTabsStore } from '../../state/tabsStore';

interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, lastAction, isExecuting, executeCommand } = useCommandController();
  const [commandInput, setCommandInput] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Regen Browser', url: '/', isActive: true },
    { id: '2', title: 'Getting Started | Regen', url: '/getting-started', isActive: false },
    { id: '3', title: 'Observations | Regen', url: '/task-runner', isActive: false },
  ]);
  const [localAssistanceEnabled, setLocalAssistanceEnabled] = useState(true);
  const [workspaceCount, setWorkspaceCount] = useState(0);

  // Track workspace count for activity indicator
  useEffect(() => {
    const updateWorkspaceCount = () => {
      setWorkspaceCount(workspaceStore.getCount());
    };
    updateWorkspaceCount();
    const interval = setInterval(updateWorkspaceCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Regen Core hooks - detect context and handle actions
  useTabRedundancyDetection();
  useSearchLoopDetection();
  useLongScrollDetection();
  useIdleDetection();
  useErrorDetection();
  useRegenCoreActions();

  // Real-time event detection hooks - emit events to EventBus
  useScrollDetection();
  useActivityDetection();

  // FIX: Listen for navigation confirmation events from backend
  useEffect(() => {
    const handleNavConfirmation = (e: CustomEvent<{ url: string; tabId?: string; success: boolean }>) => {
      const { url, tabId, success } = e.detail;
      if (!success) return;

      // Backend confirmed navigation - update tab through tabsStore
      import('../../state/tabsStore').then(({ useTabsStore }) => {
        const activeTabId = tabId || tabs.find(t => t.isActive)?.id;
        if (activeTabId) {
          useTabsStore.getState().navigateTab(activeTabId, url);
        }
      });
    };

    window.addEventListener('regen:navigate:confirmed', handleNavConfirmation as EventListener);
    return () => {
      window.removeEventListener('regen:navigate:confirmed', handleNavConfirmation as EventListener);
    };
  }, [tabs]);

  const handleRunCommand = async () => {
    if (!commandInput.trim() || isExecuting) return;

    const result = await executeCommand(commandInput, {
      currentUrl: window.location.href,
      selectedText: window.getSelection()?.toString() || '',
      activeTab: tabs.find(t => t.isActive)?.id,
    });

    if (result.success) {
      setCommandInput('');
      
      // FIX: Handle navigation result (backend-owned navigation)
      if (result.data?.url) {
        const url = result.data.url;
        
        // Check if it's a web URL (http/https) or internal route
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // Web navigation - CommandController already handled navigation request
          // Backend will emit 'regen:navigate:confirmed' event, which we listen to above
          // No direct tab update here - wait for confirmation
          showToast('Navigation initiated...', 'info');
        } else if (url.startsWith('/')) {
          // Internal route - use React Router (this is fine, it's app navigation not web navigation)
          navigate(url);
        }
      }
    } else {
      showToast(result.message || 'Command failed', 'error');
    }
  };

  const handleCommandKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRunCommand();
    }
  };

  // Listen for pre-fill command events
  useEffect(() => {
    const handlePrefill = (e: CustomEvent<{ command: string }>) => {
      setCommandInput(e.detail.command);
    };

    window.addEventListener('regen:prefill-command', handlePrefill as EventListener);
    return () => window.removeEventListener('regen:prefill-command', handlePrefill as EventListener);
  }, []);

  const handleNewTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: '/',
      isActive: true,
    };
    setTabs(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTab));
    showToast('New tab created', 'success');
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remainingTabs = tabs.filter(t => t.id !== tabId);
    if (remainingTabs.length > 0) {
      const wasActive = tabs.find(t => t.id === tabId)?.isActive;
      if (wasActive && remainingTabs.length > 0) {
        remainingTabs[0].isActive = true;
      }
      setTabs(remainingTabs);
      showToast('Tab closed', 'info');
    } else {
      showToast('Cannot close the last tab', 'warning');
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || (path === '/' && location.pathname === '/');
  };

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      <ToastContainer />
      {/* Regen Core - Sentinel AI Presence (global, not in routes) */}
      <RegenCore />
      {/* AI Offline Indicator - Shows when AI backend is unavailable */}
      {/* Subtle AI Status Dot - replaces loud banner */}
      <div className="fixed top-4 right-4 z-50">
        <AIStatusDot size="md" showTooltip={true} />
      </div>
      {/* Browser Tabs */}
      <div className="flex items-center bg-slate-800 border-b border-slate-700 px-2 py-1 min-h-[36px]">
        <div className="flex items-center space-x-1 mr-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">Regen Browser</span>
        </div>

        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            onClick={() => {
              setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === tab.id })));
              
              // FIX: Route navigation through CommandController for web URLs
              if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
                // Web navigation - route through CommandController
                executeCommand(`navigate ${tab.url}`, {
                  currentUrl: window.location.href,
                  activeTab: tab.id,
                }).catch((error) => {
                  console.error('[AppShell] Navigation failed:', error);
                });
              } else if (tab.url.startsWith('/')) {
                // Internal route - use React Router (app navigation, not web navigation)
                navigate(tab.url);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 mx-0.5 rounded-t-lg cursor-pointer border-b-2 transition-all group min-w-[120px] max-w-[200px] ${
              tab.isActive
                ? 'bg-slate-900 border-blue-500 text-slate-100'
                : 'bg-slate-700/50 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="truncate text-xs font-medium flex-1">{tab.title}</span>
            {tabs.length > 1 && (
              <motion.button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:bg-slate-600 rounded p-0.5 transition-all"
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3" />
              </motion.button>
              )}
            </motion.div>
        ))}

        <button
          onClick={handleNewTab}
          className="flex items-center justify-center w-6 h-6 mx-1 rounded hover:bg-slate-700 transition-colors"
          title="New Tab"
        >
          <Plus className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-1">
          <motion.button
            onClick={() => showToast('Downloads page coming soon', 'info')}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Download"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Download className="w-4 h-4 text-slate-400" />
          </motion.button>
          <motion.button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Refresh"
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </motion.button>
          <motion.button
            onClick={() => window.history.forward()}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Forward"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </motion.button>
        </div>

        <div className="flex-1 relative mx-4">
          <motion.div
            className="relative"
            animate={isExecuting ? { scale: 1.01 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyPress={handleCommandKeyPress}
              placeholder="Search, navigate, or ask Regen..."
              className={`w-full pl-4 pr-4 py-2 bg-slate-700/50 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:bg-slate-700 transition-all text-sm ${
                isExecuting
                  ? 'border-yellow-500/50 animate-pulse'
                  : 'border-slate-600 focus:border-blue-500'
              }`}
              disabled={isExecuting}
            />
            {isExecuting && (
              <motion.div
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Run button - demoted, only show when command detected */}
          {commandInput.trim() && (
            <motion.button
              onClick={handleRunCommand}
              disabled={isExecuting}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                isExecuting
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={!isExecuting ? { scale: 1.05 } : {}}
              whileTap={!isExecuting ? { scale: 0.95 } : {}}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{isExecuting ? '...' : 'Execute'}</span>
            </motion.button>
          )}
          <motion.button
            onClick={() => showToast('Screenshot feature coming soon', 'info')}
            className="p-2 rounded hover:bg-slate-700 transition-colors"
            title="Screenshot"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera className="w-4 h-4 text-slate-400" />
          </motion.button>
          <motion.button
            onClick={() => navigate('/workspace')}
            className="p-2 rounded hover:bg-slate-700 transition-colors"
            title="Workspace"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Folder className="w-4 h-4 text-slate-400" />
          </motion.button>
          <motion.button
            onClick={() => navigate('/settings')}
            className="p-2 rounded hover:bg-slate-700 transition-colors"
            title="Settings"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </motion.button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <motion.nav
          className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-2 mb-6">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-slate-200">Regen Browser</span>
          </div>

          <div className="space-y-1 flex-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileText className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">Command</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-blue-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    />
                  )}
                </>
              )}
            </NavLink>

            <NavLink
              to="/browse"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-orange-600/20 text-orange-400 border-l-2 border-orange-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Square className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">Browse</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-orange-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    />
                  )}
                </>
              )}
            </NavLink>

            <NavLink
              to="/workspace"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-yellow-600/20 text-yellow-400 border-l-2 border-yellow-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Folder className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">Local Workspace</span>
                  {/* Activity indicator - pulse if workspace has items */}
                  {workspaceCount > 0 && (
                    <motion.div
                      className="ml-auto w-1.5 h-1.5 bg-yellow-400/60 rounded-full"
                      animate={{
                        opacity: [0.5, 0.9, 0.5],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                  {isActive && workspaceCount === 0 && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-yellow-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    />
                  )}
                </>
              )}
            </NavLink>

            <NavLink
              to="/task-runner"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border-l-2 border-purple-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Brain className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">Observations</span>
                  {/* Activity indicator - subtle pulse when Regen Core is active */}
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 bg-purple-400/60 rounded-full"
                    animate={{
                      opacity: [0.4, 0.8, 0.4],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </>
              )}
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-slate-600/20 text-slate-300 border-l-2 border-slate-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1, rotate: 90 } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Settings className="w-5 h-5" />
                  </motion.div>
                  <span className="font-medium">Settings</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-slate-300 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    />
                  )}
                </>
              )}
            </NavLink>
            </div>
        </motion.nav>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {children}
          </div>
          
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-slate-700 bg-slate-800 px-4 py-2 flex justify-between items-center text-xs">
        <div className="flex items-center space-x-4">
          <span className="text-slate-300">
            Status: <span className={
              status === 'idle' ? 'text-green-400' :
              status === 'working' ? 'text-yellow-400' :
              'text-red-400'
            }>{status === 'idle' ? 'Idle' : status === 'working' ? 'Working' : 'Recovering'}</span>
            {' - '}
            <span className="text-blue-400">Local-first</span>
            {' - '}
            <span className="text-purple-400">Offline-ready</span>
          </span>
          {lastAction && (
            <span className="flex items-center space-x-1 text-slate-400">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Last action: {lastAction}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">Local assistance available</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localAssistanceEnabled}
                onChange={(e) => setLocalAssistanceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;