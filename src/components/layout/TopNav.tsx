/**
 * TopNav - Complete navigation bar with all components
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  Download,
  History,
  Settings,
  Bot,
  ChevronDown,
  Workflow,
  Camera,
  PictureInPicture,
  Home,
  ZoomIn,
  ZoomOut,
  Code,
  FileText,
  Network,
  Layers,
  Activity,
  Sparkles,
  Highlighter,
  Shield,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '../../state/tabsStore';
import { useOnboardingStore } from '../../state/onboardingStore';
import { useTabGraphStore } from '../../state/tabGraphStore';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { usePrivacyStore } from '../../state/privacyStore';
import { ipc } from '../../lib/ipc-typed';
import { ModeSwitch } from '../TopNav/ModeSwitch';
import { Omnibox } from '../TopNav/Omnibox';
import { ProgressBar } from '../TopNav/ProgressBar';
import { ShieldsButton } from '../TopNav/ShieldsButton';
import { NetworkButton } from '../TopNav/NetworkButton';
import { SessionSwitcher } from '../sessions/SessionSwitcher';
import { ProfileQuickSwitcher } from '../sessions/ProfileQuickSwitcher';
import { ContainerSwitcher } from '../sessions/ContainerSwitcher';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { DownloadUpdate, TabNavigationState } from '../../lib/ipc-events';
import { ThemeSwitcher } from '../TopNav/ThemeSwitcher';
import { useAppStore } from '../../state/appStore';
import { PrivacySentinelBadge } from '../TopNav/PrivacySentinelBadge';

type MenuId = 'view' | 'workspace' | 'tools' | 'agent' | 'security';

type MenuEntry =
  | {
      type: 'item';
      key: string;
      icon: LucideIcon;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      onSelect: () => void | Promise<void>;
    }
  | {
      type: 'divider';
      key: string;
    }
  | {
      type: 'section';
      key: string;
      label: string;
      description?: string;
    };

interface TopNavProps {
  onAgentToggle: () => void;
  onCommandPalette: () => void;
  onClipperToggle: () => void;
  onReaderToggle: () => void;
}

export function TopNav({ onAgentToggle, onCommandPalette, onClipperToggle, onReaderToggle }: TopNavProps) {
  const { activeId } = useTabsStore();
  const mode = useAppStore((state) => state.mode);
  const navigate = useNavigate();
  const toggleTabGraph = useTabGraphStore((state) => state.toggle);
  const openTabGraph = useTabGraphStore((state) => state.open);
  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const openConsentDashboard = useConsentOverlayStore((state) => state.open);
  const torStatus = usePrivacyStore((state) => state.tor);
  const vpnStatus = usePrivacyStore((state) => state.vpn);
  const startTor = usePrivacyStore((state) => state.startTor);
  const stopTor = usePrivacyStore((state) => state.stopTor);
  const newTorIdentity = usePrivacyStore((state) => state.newTorIdentity);
  const checkVpn = usePrivacyStore((state) => state.checkVpn);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [agentActive, setAgentActive] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const closeMenus = useCallback(() => setActiveMenu(null), []);
  const toggleMenu = useCallback(
    (menu: MenuId) => {
      setActiveMenu((current) => (current === menu ? null : menu));
    },
    []
  );
  const navigationStateRef = useRef({
    activeId: activeId ?? null,
    canGoBack: false,
    canGoForward: false,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigationStateRef.current = {
      activeId: activeId ?? null,
      canGoBack,
      canGoForward,
    };
  }, [activeId, canGoBack, canGoForward]);

  useEffect(() => {
    const handleGraphShortcut = (event: KeyboardEvent) => {
      const isGraphShortcut =
        (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'g';
      if (isGraphShortcut) {
        event.preventDefault();
        void toggleTabGraph();
      }
    };
    window.addEventListener('keydown', handleGraphShortcut);
    return () => window.removeEventListener('keydown', handleGraphShortcut);
  }, [toggleTabGraph]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeMenu) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };
    const options: AddEventListenerOptions = { capture: true };
    window.addEventListener('keydown', handleEscape, options);
    return () => window.removeEventListener('keydown', handleEscape, options);
  }, [activeMenu, closeMenus]);

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

  // Load initial download count (wait for IPC)
  useEffect(() => {
    const loadDownloads = async () => {
      // Wait for IPC to be ready
      if (!window.ipc || typeof window.ipc.invoke !== 'function') {
        // Retry after a delay
        setTimeout(loadDownloads, 500);
        return;
      }
      
      try {
        const list = await ipc.downloads.list();
        const active = Array.isArray(list) ? list.filter((d: any) => d.status === 'in-progress').length : 0;
        setDownloadCount(active);
      } catch {
        // Silently handle - will retry if needed
      }
    };
    
    // Delay initial load to allow IPC to initialize
    setTimeout(loadDownloads, 300);
  }, []);

  const handleBack = useCallback(async () => {
    const { activeId: currentActiveId } = navigationStateRef.current;
    if (!currentActiveId) return;
    try {
      await ipc.tabs.goBack(currentActiveId);
      // Navigation state will be updated via IPC event
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  }, []);

  const handleForward = useCallback(async () => {
    const { activeId: currentActiveId } = navigationStateRef.current;
    if (!currentActiveId) return;
    try {
      await ipc.tabs.goForward(currentActiveId);
      // Navigation state will be updated via IPC event
    } catch (error) {
      console.error('Failed to go forward:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const { activeId: currentActiveId } = navigationStateRef.current;
    if (!currentActiveId) return;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setIsLoading(true);
    try {
      await ipc.tabs.reload(currentActiveId);
      // Reset loading state after a delay
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        refreshTimerRef.current = null;
      }, 1000);
    } catch (error) {
      console.error('Failed to refresh:', error);
      setIsLoading(false);
    }
  }, []);

  // Keyboard shortcuts for navigation and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { activeId: currentActiveId, canGoBack: currentCanGoBack, canGoForward: currentCanGoForward } = navigationStateRef.current;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const altModifier = e.altKey;

      // Don't intercept if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((modifier || altModifier) && e.key === 'ArrowLeft' && !e.shiftKey) {
        if (currentCanGoBack && currentActiveId) {
          e.preventDefault();
          void handleBack();
        }
        return;
      }

      if ((modifier || altModifier) && e.key === 'ArrowRight' && !e.shiftKey) {
        if (currentCanGoForward && currentActiveId) {
          e.preventDefault();
          void handleForward();
        }
        return;
      }

      if (modifier && e.key.toLowerCase() === 'r' && !e.shiftKey) {
        if (currentActiveId) {
          e.preventDefault();
          void handleRefresh();
        }
        return;
      }

      if (e.key === 'F5' && currentActiveId) {
        e.preventDefault();
        void handleRefresh();
      }

      // Zoom shortcuts
      if (modifier && (e.key === '+' || e.key === '=') && currentActiveId) {
        e.preventDefault();
        ipc.tabs.zoomIn(currentActiveId).catch(console.error);
        return;
      }

      if (modifier && e.key === '-' && currentActiveId) {
        e.preventDefault();
        ipc.tabs.zoomOut(currentActiveId).catch(console.error);
        return;
      }

      if (modifier && e.key === '0' && currentActiveId) {
        e.preventDefault();
        ipc.tabs.zoomReset(currentActiveId).catch(console.error);
        return;
      }

      // DevTools shortcuts: F12 or Cmd+Shift+I / Ctrl+Shift+I
      if (e.key === 'F12' || (modifier && e.shiftKey && e.key.toLowerCase() === 'i')) {
        if (currentActiveId) {
          e.preventDefault();
          ipc.tabs.devtools(currentActiveId).catch(console.error);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, handleForward, handleRefresh]);

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
    if (!activeId) return;
    try {
      const result = await ipc.tabs.screenshot(activeId);
      if (result?.success) {
        // Screenshot saved, folder opened
        console.log('Screenshot saved:', result.path);
      } else {
        console.error('Screenshot failed:', result?.error);
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  const handlePIP = async () => {
    if (!activeId) return;
    try {
      const result = await ipc.tabs.pip(activeId, true);
      if (!result?.success) {
        console.warn('PIP request failed:', result?.error || 'No video element found');
      }
    } catch (error) {
      console.error('Failed to enter PIP:', error);
    }
  };

  const handleFindInPage = useCallback(async () => {
    if (!activeId) return;
    try {
      await ipc.tabs.find(activeId);
    } catch (error) {
      console.error('Failed to open find:', error);
    }
  }, [activeId]);

  const handleToggleDevtools = useCallback(async () => {
    if (!activeId) return;
    try {
      await ipc.tabs.devtools(activeId);
    } catch (error) {
      console.error('Failed to toggle DevTools:', error);
    }
  }, [activeId]);

  const handleMenuSelect = useCallback(
    (entry: MenuEntry) => {
      if (entry.type !== 'item' || entry.disabled) return;
      const result = entry.onSelect();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>)
          .catch((error) => {
            console.error(`Failed to run menu action "${entry.key}"`, error);
          })
          .finally(() => closeMenus());
      } else {
        closeMenus();
      }
    },
    [closeMenus]
  );

  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC');

  const viewMenuEntries: MenuEntry[] = [
    {
      type: 'item',
      key: 'zoom-in',
      icon: ZoomIn,
      label: 'Zoom In',
      shortcut: isMac ? '⌘ +' : 'Ctrl +',
      disabled: !activeId,
      onSelect: async () => {
        if (!activeId) return;
        await ipc.tabs.zoomIn(activeId);
      },
    },
    {
      type: 'item',
      key: 'zoom-out',
      icon: ZoomOut,
      label: 'Zoom Out',
      shortcut: isMac ? '⌘ -' : 'Ctrl -',
      disabled: !activeId,
      onSelect: async () => {
        if (!activeId) return;
        await ipc.tabs.zoomOut(activeId);
      },
    },
    {
      type: 'item',
      key: 'zoom-reset',
      icon: Search,
      label: 'Reset Zoom',
      shortcut: isMac ? '⌘ 0' : 'Ctrl 0',
      disabled: !activeId,
      onSelect: async () => {
        if (!activeId) return;
        await ipc.tabs.zoomReset(activeId);
      },
    },
  ];

  const workspaceMenuEntries = useMemo<MenuEntry[]>(() => {
    const base: Record<string, MenuEntry & { type: 'item' }> = {
      'knowledge-graph': {
        type: 'item',
        key: 'knowledge-graph',
        icon: Layers,
        label: 'Research Graph',
        onSelect: () => navigate('/'),
      },
      'history-graph': {
        type: 'item',
        key: 'history-graph',
        icon: Network,
        label: 'History Graph',
        onSelect: () => navigate('/history'),
      },
      workspaces: {
        type: 'item',
        key: 'workspaces',
        icon: FileText,
        label: 'Workspace Library',
        onSelect: () => navigate('/workspace'),
      },
      playbooks: {
        type: 'item',
        key: 'playbooks',
        icon: Workflow,
        label: 'Auto-Research Playbooks',
        onSelect: () => navigate('/playbooks'),
      },
      'automation-runs': {
        type: 'item',
        key: 'automation-runs',
        icon: Bot,
        label: 'Automation Runs',
        onSelect: () => navigate('/runs'),
      },
      consent: {
        type: 'item',
        key: 'consent-ledger',
        icon: Shield,
        label: 'Consent Ledger',
        onSelect: () => void openConsentDashboard(),
      },
      'tab-graph': {
        type: 'item',
        key: 'tab-graph',
        icon: Network,
        label: 'Tab DNA Overlay',
        onSelect: () => void openTabGraph(),
      },
    };

    const focusMap: Record<string, { label: string; description: string; keys: string[] }> = {
      Research: {
        label: 'Research Focus',
        description: 'Suggested graph + consent tooling',
        keys: ['knowledge-graph', 'tab-graph', 'consent'],
      },
      Trade: {
        label: 'Trade Focus',
        description: 'Stay ahead of market changes',
        keys: ['history-graph', 'playbooks', 'automation-runs'],
      },
      Games: {
        label: 'Gaming Focus',
        description: 'Keep streams and overlays lean',
        keys: ['tab-graph', 'history-graph'],
      },
      Browse: {
        label: 'Everyday Focus',
        description: 'Quick jump to your spaces',
        keys: ['workspaces', 'history-graph', 'knowledge-graph'],
      },
    };

    const persona = focusMap[mode] ?? focusMap.Browse;
    const used = new Set<string>();
    const entries: MenuEntry[] = [];

    entries.push({
      type: 'section',
      key: 'persona-section',
      label: persona.label,
      description: persona.description,
    });

    persona.keys.forEach((key) => {
      const entry = base[key];
      if (entry && !used.has(key)) {
        entries.push(entry);
        used.add(key);
      }
    });

    entries.push({ type: 'divider', key: 'persona-divider' });
    entries.push({ type: 'section', key: 'all-tools', label: 'All workspace tools' });

    Object.entries(base).forEach(([key, entry]) => {
      if (!used.has(key)) {
        entries.push(entry);
        used.add(key);
      }
    });

    return entries;
  }, [mode, navigate, openConsentDashboard, openTabGraph]);

  const toolsMenuEntries: MenuEntry[] = [
    {
      type: 'item',
      key: 'find',
      icon: Search,
      label: 'Find in Page',
      shortcut: isMac ? '⌘ F' : 'Ctrl F',
      disabled: !activeId,
      onSelect: handleFindInPage,
    },
    {
      type: 'item',
      key: 'screenshot',
      icon: Camera,
      label: 'Capture Screenshot',
      disabled: !activeId,
      onSelect: handleScreenshot,
    },
    {
      type: 'item',
      key: 'pip',
      icon: PictureInPicture,
      label: 'Picture-in-Picture',
      disabled: !activeId,
      onSelect: handlePIP,
    },
    {
      type: 'item',
      key: 'devtools',
      icon: Code,
      label: 'Toggle DevTools',
      shortcut: isMac ? '⌘ ⇧ I' : 'Ctrl ⇧ I',
      disabled: !activeId,
      onSelect: handleToggleDevtools,
    },
    { type: 'divider', key: 'tools-divider' },
    {
      type: 'item',
      key: 'guided-tour',
      icon: Sparkles,
      label: 'Run Guided Tour',
      onSelect: () => {
        resetOnboarding();
      },
    },
    {
      type: 'item',
      key: 'watchers',
      icon: Activity,
      label: 'Page Watchers',
      onSelect: () => {
        navigate('/watchers');
      },
    },
    {
      type: 'item',
      key: 'history',
      icon: History,
      label: 'History',
      onSelect: () => {
        navigate('/history');
      },
    },
    {
      type: 'item',
      key: 'tab-graph',
      icon: Network,
      label: 'Tab Graph Overlay',
      shortcut: isMac ? '⌘⇧G' : 'Ctrl⇧G',
      onSelect: () => {
        void openTabGraph();
      },
    },
    {
      type: 'item',
      key: 'consent-dashboard',
      icon: Shield,
      label: 'Consent Playground',
      onSelect: () => {
        void openConsentDashboard();
      },
    },
  ];

  const agentMenuEntries: MenuEntry[] = [
    {
      type: 'item',
      key: 'agent-console',
      icon: Bot,
      label: 'Open Agent Console',
      shortcut: isMac ? '⌘⇧A' : 'Ctrl+Shift+A',
      onSelect: () => onAgentToggle(),
    },
    {
      type: 'item',
      key: 'ask-agent',
      icon: Sparkles,
      label: 'Ask Agent',
      shortcut: isMac ? '⌘K' : 'Ctrl+K',
      onSelect: () => onCommandPalette(),
    },
    { type: 'divider', key: 'agent-divider' },
    {
      type: 'item',
      key: 'clip-highlight',
      icon: Highlighter,
      label: 'Clip Highlight',
      shortcut: isMac ? '⌘⇧H' : 'Ctrl+Shift+H',
      onSelect: () => onClipperToggle(),
    },
    {
      type: 'item',
      key: 'reader-mode',
      icon: FileText,
      label: 'Reader Mode',
      shortcut: isMac ? '⌘⇧R' : 'Ctrl+Shift+R',
      onSelect: () => onReaderToggle(),
    },
  ];

  const securityMenuEntries: MenuEntry[] = [
    {
      type: 'item',
      key: 'privacy-shields',
      icon: Shield,
      label: 'Privacy Shields',
      onSelect: () => {
        const target = document.querySelector('[data-shields-button]') as HTMLElement | null;
        target?.click();
      },
    },
    {
      type: 'item',
      key: 'network-controls',
      icon: Wifi,
      label: 'Network Controls',
      onSelect: () => {
        const target = document.querySelector('[data-network-button]') as HTMLElement | null;
        target?.click();
      },
    },
    {
      type: 'item',
      key: 'tor-toggle',
      icon: Shield,
      label: torStatus.running ? 'Disable Tor' : 'Enable Tor',
      onSelect: () => {
        if (torStatus.running) {
          void stopTor();
        } else {
          void startTor();
        }
      },
    },
    {
      type: 'item',
      key: 'tor-new-identity',
      icon: RefreshCw,
      label: 'Tor: New Identity',
      disabled: !torStatus.running || Boolean(torStatus.stub),
      onSelect: () => {
        if (torStatus.running && !torStatus.stub) {
          void newTorIdentity();
        }
      },
    },
    {
      type: 'item',
      key: 'vpn-status',
      icon: Wifi,
      label: vpnStatus.connected
        ? `VPN: ${vpnStatus.type ? vpnStatus.type.toUpperCase() : 'Active'}`
        : 'Check VPN Status',
      onSelect: () => {
        void checkVpn();
      },
    },
    { type: 'divider', key: 'security-divider' },
    {
      type: 'item',
      key: 'history-graph',
      icon: History,
      label: 'History Graph',
      onSelect: () => navigate('/history'),
    },
  ];

  const renderMenuButton = (menuId: MenuId, label: string, entries: MenuEntry[]) => {
    const isOpen = activeMenu === menuId;
    return (
      <div key={menuId} className="relative">
        <motion.button
          type="button"
          onClick={() => toggleMenu(menuId)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`button-surface flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${
            isOpen ? 'button-surface--active text-primary' : 'text-muted'
          }`}
          title={`${label} menu`}
        >
          <span>{label}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.button
                key={`${menuId}-backdrop`}
                type="button"
                aria-label={`Close ${label} menu`}
                className="fixed inset-0 z-40 bg-transparent pointer-events-auto focus:outline-none"
                onClick={closeMenus}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                key={`${menuId}-menu`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-60 bg-surface-elevated border border-surface rounded-lg shadow-2xl z-50 py-2"
              >
                {entries.map((entry) => {
                  if (entry.type === 'divider') {
                    return <div key={entry.key} className="h-px my-1 bg-[var(--surface-border)]/60" />;
                  }
                  if (entry.type === 'section') {
                    return (
                      <div key={entry.key} className="px-4 pt-1 pb-2 text-[10px] uppercase tracking-[0.24em] text-muted">
                        <div>{entry.label}</div>
                        {entry.description && (
                          <div className="mt-1 text-[10px] normal-case tracking-normal text-muted/80">
                            {entry.description}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      disabled={entry.disabled}
                      onClick={() => handleMenuSelect(entry)}
                      className="menu-item w-full"
                    >
                      <entry.icon size={16} className="text-muted" />
                      <span className="flex-1 text-left">{entry.label}</span>
                      {entry.shortcut && (
                        <kbd className="text-xs text-muted border border-surface rounded px-1.5 py-0.5">
                          {entry.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="drag h-14 flex items-center px-4 gap-4 bg-surface-panel border-b border-surface shadow-lg text-primary transition-colors">
      {/* Left: Mode & Session controls */}
      <div className="no-drag flex items-center gap-2">
        <ModeSwitch />
        <SessionSwitcher />
        <div className="hidden xl:flex items-center gap-2">
          <ProfileQuickSwitcher />
          <ContainerSwitcher />
        </div>
      </div>

      {/* Browser Navigation Controls */}
      <div className="no-drag flex items-center gap-1.5 flex-shrink-0">
        {/* Home Button */}
        <motion.button
          onClick={() => navigate('/')}
          aria-label="Go to home"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="no-drag p-2.5 rounded-lg button-surface hover:text-primary"
          title="Home (Go to home screen)"
        >
          <Home size={18} />
        </motion.button>
        
        <motion.button
          onClick={handleBack}
          disabled={!canGoBack || !activeId}
          aria-label="Go back"
          aria-disabled={!canGoBack || !activeId}
          whileHover={{ scale: canGoBack && activeId ? 1.05 : 1 }}
          whileTap={{ scale: canGoBack && activeId ? 0.95 : 1 }}
          className={`no-drag p-2.5 rounded-lg button-surface ${
            canGoBack && activeId ? 'hover:text-primary' : 'opacity-40 cursor-not-allowed'
          }`}
          title="Back (Alt+← / ⌘←)"
        >
          <ArrowLeft size={18} />
        </motion.button>
        <motion.button
          onClick={handleForward}
          disabled={!canGoForward || !activeId}
          aria-label="Go forward"
          aria-disabled={!canGoForward || !activeId}
          whileHover={{ scale: canGoForward && activeId ? 1.05 : 1 }}
          whileTap={{ scale: canGoForward && activeId ? 0.95 : 1 }}
          className={`no-drag p-2.5 rounded-lg button-surface ${
            canGoForward && activeId ? 'hover:text-primary' : 'opacity-40 cursor-not-allowed'
          }`}
          title="Forward (Alt+→ / ⌘→)"
        >
          <ArrowRight size={18} />
        </motion.button>
        <motion.button
          onClick={handleRefresh}
          disabled={!activeId}
          aria-label="Refresh page"
          aria-disabled={!activeId}
          whileHover={{ scale: activeId ? 1.05 : 1 }}
          whileTap={{ scale: activeId ? 0.95 : 1 }}
          className={`no-drag p-2.5 rounded-lg button-surface ${
            activeId ? 'hover:text-primary' : 'opacity-40 cursor-not-allowed'
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

      {/* Center: Omnibox with Progress Bar */}
      <div className="no-drag flex-1 relative mx-4" data-onboarding="omnibox">
        <Omnibox onCommandPalette={onCommandPalette} />
        <ProgressBar />
      </div>

      {/* Right: Actions & Badges */}
      <div className="no-drag flex items-center gap-1.5">
        {renderMenuButton('agent', 'Agent', agentMenuEntries)}
        {renderMenuButton('view', 'View', viewMenuEntries)}
        {renderMenuButton('workspace', 'Workspace', workspaceMenuEntries)}
        {renderMenuButton('tools', 'Tools', toolsMenuEntries)}
        {renderMenuButton('security', 'Security', securityMenuEntries)}
        <PrivacySentinelBadge />
        <ThemeSwitcher />
        <div className="hidden 2xl:flex items-center gap-1.5">
          <ShieldsButton />
          <NetworkButton />
        </div>
        <motion.button
          onClick={() => {
            navigate('/downloads');
          }}
          aria-label={`Downloads${downloadCount > 0 ? ` (${downloadCount} active)` : ''}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="no-drag relative p-2 rounded-lg button-surface hover:text-primary"
          title={`Downloads${downloadCount > 0 ? ` (${downloadCount} active)` : ''}`}
        >
          <Download size={18} />
          {downloadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
              aria-label={`${downloadCount} active download${downloadCount > 1 ? 's' : ''}`}
            >
              {downloadCount > 9 ? '9+' : downloadCount}
            </motion.span>
          )}
        </motion.button>
        <motion.button
          onClick={() => navigate('/settings')}
          aria-label="Open settings"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="no-drag p-2 rounded-lg button-surface hover:text-primary"
          title="Settings"
        >
          <Settings size={18} />
        </motion.button>
        <motion.button
          onClick={onAgentToggle}
          aria-label={`Agent console${agentActive ? ' (active)' : ''}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`no-drag p-2 rounded-lg button-surface ${
            agentActive ? 'button-surface--active shadow-[0_0_18px_rgba(59,130,246,0.35)] text-primary' : 'hover:text-primary'
          }`}
          title="Agent Console (⌘⇧A)"
        >
          <Bot size={18} />
          {agentActive && (
            <motion.span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-label="Agent is active"
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}

