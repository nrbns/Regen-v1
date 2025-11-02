/**
 * TopNav - Complete navigation bar with all components
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Camera, PictureInPicture, Search, Download, History, Settings, Bot, ChevronDown, Workflow } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { ModeSwitch } from '../TopNav/ModeSwitch';
import { Omnibox } from '../TopNav/Omnibox';
import { ShieldsButton } from '../TopNav/ShieldsButton';
import { NetworkButton } from '../TopNav/NetworkButton';
import { SessionSwitcher } from '../sessions/SessionSwitcher';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { DownloadUpdate, TabNavigationState } from '../../lib/ipc-events';

interface TopNavProps {
  onAgentToggle: () => void;
  onCommandPalette: () => void;
}

export function TopNav({ onAgentToggle, onCommandPalette }: TopNavProps) {
  const { activeId } = useTabsStore();
  const navigate = useNavigate();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [agentActive, setAgentActive] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);

  // Listen for download updates
  useIPCEvent<DownloadUpdate>('downloads:started', () => {
    setDownloadCount(prev => prev + 1);
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:done', () => {
    setDownloadCount(prev => Math.max(0, prev - 1));
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:progress', () => {
    // Keep track of active downloads
  }, []);

  // Listen for agent activity
  useIPCEvent('agent:plan', () => {
    setAgentActive(true);
  }, []);

  // Load initial download count
  useEffect(() => {
    ipc.downloads.list().then((list: any) => {
      const active = Array.isArray(list) ? list.filter((d: any) => d.status === 'in-progress').length : 0;
      setDownloadCount(active);
    }).catch(() => {});
  }, []);

  const handleBack = async () => {
    if (!activeId) return;
    try {
      await ipc.tabs.goBack(activeId);
      // Navigation state will be updated via IPC event
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  };

  const handleForward = async () => {
    if (!activeId) return;
    try {
      await ipc.tabs.goForward(activeId);
      // Navigation state will be updated via IPC event
    } catch (error) {
      console.error('Failed to go forward:', error);
    }
  };

  const handleRefresh = async () => {
    if (!activeId) return;
    setIsLoading(true);
    try {
      await ipc.tabs.reload(activeId);
      // Reset loading state after a delay
      setTimeout(() => setIsLoading(false), 1000);
    } catch (error) {
      console.error('Failed to refresh:', error);
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const altModifier = e.altKey;

      // Alt+← / ⌘←: Go back
      if ((modifier || altModifier) && e.key === 'ArrowLeft' && !e.shiftKey) {
        if (canGoBack && activeId) {
          e.preventDefault();
          handleBack();
        }
        return;
      }

      // Alt+→ / ⌘→: Go forward
      if ((modifier || altModifier) && e.key === 'ArrowRight' && !e.shiftKey) {
        if (canGoForward && activeId) {
          e.preventDefault();
          handleForward();
        }
        return;
      }

      // Ctrl+R / ⌘R: Refresh (prevent default browser refresh)
      if (modifier && e.key.toLowerCase() === 'r' && !e.shiftKey) {
        if (activeId) {
          e.preventDefault();
          handleRefresh();
        }
        return;
      }

      // F5: Refresh
      if (e.key === 'F5' && activeId) {
        e.preventDefault();
        handleRefresh();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, canGoBack, canGoForward]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for navigation state updates from backend
  useIPCEvent<{ tabId: string; canGoBack: boolean; canGoForward: boolean }>(
    'tabs:navigation-state',
    (state) => {
      if (state.tabId === activeId) {
        setCanGoBack(state.canGoBack);
        setCanGoForward(state.canGoForward);
      }
    },
    [activeId]
  );

  // Update navigation state when active tab changes
  useEffect(() => {
    if (!activeId) {
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }
    
    // Request navigation state from the backend
    const updateNavigationState = async () => {
      try {
        // The navigation state will be updated via IPC events
        // But we can also try to get it directly if needed
        const tabs = await ipc.tabs.list();
        const activeTab = tabs.find((t: any) => t.id === activeId);
        // Navigation state is managed by backend and sent via events
      } catch (error) {
        console.error('Failed to update navigation state:', error);
      }
    };
    
    updateNavigationState();
  }, [activeId]);

  const handleScreenshot = async () => {
    if (activeId) {
      try {
        // Would implement screenshot capture
        // await ipc.tabs.captureScreenshot(activeId);
      } catch {}
    }
  };

  const handlePIP = async () => {
    if (activeId) {
      try {
        // Would implement picture-in-picture
        // await ipc.tabs.enterPIP(activeId);
      } catch {}
    }
  };

  return (
    <div className="h-14 flex items-center px-4 gap-4 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 shadow-lg">
          {/* Left: Mode Switch + Session Switcher */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <ModeSwitch />
            <SessionSwitcher />
          </div>

      {/* Browser Navigation Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.button
          onClick={handleBack}
          disabled={!canGoBack || !activeId}
          whileHover={{ scale: canGoBack && activeId ? 1.05 : 1 }}
          whileTap={{ scale: canGoBack && activeId ? 0.95 : 1 }}
          className={`p-2.5 rounded-lg transition-all ${
            canGoBack && activeId
              ? 'bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-gray-100 cursor-pointer'
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="Back (Alt+← / ⌘←)"
        >
          <ArrowLeft size={18} />
        </motion.button>
        <motion.button
          onClick={handleForward}
          disabled={!canGoForward || !activeId}
          whileHover={{ scale: canGoForward && activeId ? 1.05 : 1 }}
          whileTap={{ scale: canGoForward && activeId ? 0.95 : 1 }}
          className={`p-2.5 rounded-lg transition-all ${
            canGoForward && activeId
              ? 'bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-gray-100 cursor-pointer'
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="Forward (Alt+→ / ⌘→)"
        >
          <ArrowRight size={18} />
        </motion.button>
        <motion.button
          onClick={handleRefresh}
          disabled={!activeId}
          whileHover={{ scale: activeId ? 1.05 : 1 }}
          whileTap={{ scale: activeId ? 0.95 : 1 }}
          className={`p-2.5 rounded-lg transition-all ${
            activeId
              ? 'bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-gray-100 cursor-pointer'
              : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="Refresh (Ctrl+R / ⌘R)"
        >
          <motion.div
            animate={{ rotate: isLoading ? 360 : 0 }}
            transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
            className="flex items-center justify-center"
          >
            <RefreshCw size={18} />
          </motion.div>
        </motion.button>
      </div>

      {/* Center: Omnibox */}
      <Omnibox onCommandPalette={onCommandPalette} />

      {/* Right: Actions & Badges */}
      <div className="flex items-center gap-1.5">
        {/* Shields Button */}
        <ShieldsButton />

        {/* Network Button */}
        <NetworkButton />

        {/* Dropdown/Filter Button */}
        <motion.button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Options"
        >
          <ChevronDown size={18} />
        </motion.button>

        {/* Hierarchy/Structure Button */}
        <motion.button
          onClick={() => setHierarchyOpen(!hierarchyOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="View Hierarchy"
        >
          <Workflow size={18} />
          <ChevronDown size={12} className="absolute bottom-0 right-0" />
        </motion.button>

        {/* Camera/Screenshot Button */}
        <motion.button
          onClick={handleScreenshot}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Screenshot (⌘⇧S)"
        >
          <Camera size={18} />
        </motion.button>

        {/* PIP Button */}
        <motion.button
          onClick={handlePIP}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Picture-in-Picture"
        >
          <PictureInPicture size={18} />
        </motion.button>

        {/* Find Button */}
        <motion.button
          onClick={() => {
            if (activeId) {
              // Send find command to active tab
              window.dispatchEvent(new KeyboardEvent('keydown', { 
                key: 'f', 
                metaKey: true, 
                ctrlKey: true,
                bubbles: true 
              }));
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Find (⌘F)"
        >
          <Search size={18} />
        </motion.button>

            {/* Download Button - Real-time count */}
            <motion.button
              onClick={() => {
                navigate('/downloads');
              }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Downloads"
        >
          <Download size={18} />
          {downloadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
            >
              {downloadCount > 9 ? '9+' : downloadCount}
            </motion.span>
          )}
        </motion.button>

            {/* History Button */}
            <motion.button
              onClick={() => {
                navigate('/history');
              }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="History"
        >
          <History size={18} />
        </motion.button>

        {/* Settings Button */}
        <motion.button
          onClick={() => navigate('/settings')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          title="Settings"
        >
          <Settings size={18} />
        </motion.button>

        {/* Agent Console Button - With gradient and green dot */}
        <motion.button
          onClick={onAgentToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg bg-gradient-to-br from-purple-600/60 to-blue-600/60 hover:from-purple-600/80 hover:to-blue-600/80 border border-purple-500/30 text-white transition-all shadow-lg shadow-purple-500/20"
          title="Agent Console (⌘⇧A)"
        >
          <Bot size={18} />
          {agentActive && (
            <motion.span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
