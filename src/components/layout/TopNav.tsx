/**
 * TopNav - Complete navigation bar with all components
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Download,
  Settings,
  Bot,
  ChevronDown,
  Workflow,
  Camera,
  PictureInPicture,
  Code,
  FileText,
  Network,
  Plus,
  Sparkles,
  Highlighter,
  Shield,
  Wifi,
  Search,
  Activity,
  Home,
  MoreHorizontal,
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
import { Omnibox, type OmniboxHandle } from '../TopNav/Omnibox';
import { ProgressBar } from '../TopNav/ProgressBar';
import { SessionSwitcher } from '../sessions/SessionSwitcher';
import { ProfileQuickSwitcher } from '../sessions/ProfileQuickSwitcher';
import { ContainerSwitcher } from '../sessions/ContainerSwitcher';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { DownloadUpdate } from '../../lib/ipc-events';
import { ThemeSwitcher } from '../TopNav/ThemeSwitcher';
import { PrivacySentinelBadge } from '../TopNav/PrivacySentinelBadge';
import { ShieldsButton } from '../TopNav/ShieldsButton';
import { NetworkButton } from '../TopNav/NetworkButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { createFallbackTab } from '../../lib/tabFallback';
import { RedixQuickDialog } from '../RedixQuickDialog';

type MenuKey = 'file' | 'ai' | 'tools';

const createMenuState = (overrides?: Partial<Record<MenuKey, boolean>>): Record<MenuKey, boolean> => ({
  file: false,
  ai: false,
  tools: false,
  ...overrides,
});

type MenuEntry =
  | {
      type: 'item';
      key: string;
      icon?: LucideIcon;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      onSelect: () => void | Promise<void>;
    }
  | {
      type: 'separator';
      key: string;
    }
  | {
      type: 'label';
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
  const omniboxRef = useRef<OmniboxHandle | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [agentActive, setAgentActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState<Record<MenuKey, boolean>>(createMenuState());
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const compactMenuRef = useRef<HTMLDivElement | null>(null);
  const [redixDialogOpen, setRedixDialogOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setMenuOpen(createMenuState());
  }, []);

  const handleMenuOpenChange = useCallback(
    (menu: MenuKey) => (open: boolean) => {
      setMenuOpen((prev) => {
        if (open) {
          return createMenuState({ [menu]: true });
        }
        if (!open && prev[menu]) {
          return { ...prev, [menu]: false };
        }
        return prev;
      });
    },
    [],
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
    const handleOmniboxShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.shiftKey || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() !== 'k') {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isWithinOmnibox = target?.hasAttribute('data-omnibox-input');
      event.preventDefault();
      closeMenus();
      requestAnimationFrame(() => {
        omniboxRef.current?.focus?.();
      });
      if (!isWithinOmnibox) {
        const activeEl = document.activeElement as HTMLElement | null;
        activeEl?.blur?.();
      }
    };
    window.addEventListener('keydown', handleOmniboxShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleOmniboxShortcut, { capture: true });
  }, [closeMenus]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  // Handle outside clicks for more menu
  useEffect(() => {
    if (!compactMenuOpen) return;
    const listenerOptions: AddEventListenerOptions = { capture: true };
    const handleOutside = (event: MouseEvent) => {
      if (!compactMenuRef.current) return;
      if (compactMenuRef.current.contains(event.target as Node)) return;
      setCompactMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside, listenerOptions);
    return () => document.removeEventListener('mousedown', handleOutside, listenerOptions);
  }, [compactMenuOpen]);

  useEffect(() => {
    const anyMenuOpen = menuOpen.file || menuOpen.ai || menuOpen.tools;
    if (!anyMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };
    const options: AddEventListenerOptions = { capture: true };
    window.addEventListener('keydown', handleEscape, options);
    return () => window.removeEventListener('keydown', handleEscape, options);
  }, [closeMenus, menuOpen]);

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
        const active = Array.isArray(list)
          ? list.filter((d: any) => ['downloading', 'verifying', 'paused'].includes(d.status)).length
          : 0;
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

  const handleNewTab = useCallback(async () => {
    try {
      const result = await ipc.tabs.create('about:blank');
      const success = result && typeof result === 'object' && 'success' in result ? result.success !== false : Boolean(result);
      if (!success) {
        createFallbackTab({ url: 'about:blank', title: 'New Tab' });
      }
    } catch (error) {
      console.error('Failed to open a new tab:', error);
      createFallbackTab({ url: 'about:blank', title: 'New Tab' });
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
        await ipc.tabs.list();
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

  const fileMenuEntries = useMemo<MenuEntry[]>(() => {
    const downloadsLabel = downloadCount > 0 ? `Downloads (${Math.min(downloadCount, 99)})` : 'Downloads';
    return [
      {
        type: 'label',
        key: 'file-label',
        label: 'Workspace & tabs',
        description: 'Open and manage the current browsing session',
      },
      {
        type: 'item',
        key: 'file-home',
        icon: Home,
        label: 'Go home',
        shortcut: isMac ? '⌘ 1' : 'Alt 1',
        onSelect: () => navigate('/'),
      },
      {
        type: 'item',
        key: 'file-new-tab',
        icon: Plus,
        label: 'New tab',
        shortcut: isMac ? '⌘ T' : 'Ctrl T',
        onSelect: handleNewTab,
      },
      {
        type: 'item',
        key: 'file-back',
        icon: ArrowLeft,
        label: 'Back',
        shortcut: isMac ? '⌘ ←' : 'Alt ←',
        disabled: !canGoBack,
        onSelect: handleBack,
      },
      {
        type: 'item',
        key: 'file-forward',
        icon: ArrowRight,
        label: 'Forward',
        shortcut: isMac ? '⌘ →' : 'Alt →',
        disabled: !canGoForward,
        onSelect: handleForward,
      },
      {
        type: 'item',
        key: 'file-refresh',
        icon: RefreshCw,
        label: isLoading ? 'Refreshing…' : 'Refresh',
        shortcut: isMac ? '⌘ R' : 'Ctrl R',
        disabled: !activeId,
        onSelect: handleRefresh,
      },
      { type: 'separator', key: 'file-separator' },
      {
        type: 'item',
        key: 'file-downloads',
        icon: Download,
        label: downloadsLabel,
        onSelect: () => navigate('/downloads'),
      },
      {
        type: 'item',
        key: 'file-settings',
        icon: Settings,
        label: 'Settings',
        shortcut: isMac ? '⌘ ,' : 'Ctrl ,',
        onSelect: () => navigate('/settings'),
      },
    ];
  }, [
    activeId,
    canGoBack,
    canGoForward,
    downloadCount,
    handleBack,
    handleForward,
    handleNewTab,
    handleRefresh,
    isLoading,
    isMac,
    navigate,
  ]);

  const aiMenuEntries = useMemo<MenuEntry[]>(() => {
    return [
      {
        type: 'label',
        key: 'ai-label',
        label: 'Intelligence',
        description: 'Ask Redix and automate the tab in real time',
      },
      {
        type: 'item',
        key: 'ai-ask',
        icon: Sparkles,
        label: 'Ask Redix',
        shortcut: isMac ? '⌘ K' : 'Ctrl K',
        onSelect: () => {
          setRedixDialogOpen(true);
          closeMenus();
        },
      },
      {
        type: 'item',
        key: 'ai-console',
        icon: Bot,
        label: 'Agent console',
        shortcut: isMac ? '⌘ ⇧ A' : 'Ctrl ⇧ A',
        onSelect: () => onAgentToggle(),
      },
      { type: 'separator', key: 'ai-separator' },
      {
        type: 'item',
        key: 'ai-clip',
        icon: Highlighter,
        label: 'Clip highlight',
        shortcut: isMac ? '⌘ ⇧ H' : 'Ctrl ⇧ H',
        onSelect: () => onClipperToggle(),
      },
      {
        type: 'item',
        key: 'ai-reader',
        icon: FileText,
        label: 'Reader mode',
        shortcut: isMac ? '⌘ ⇧ R' : 'Ctrl ⇧ R',
        onSelect: () => onReaderToggle(),
      },
      {
        type: 'item',
        key: 'ai-watchers',
        icon: Activity,
        label: 'Page watchers',
        onSelect: () => navigate('/watchers'),
      },
      {
        type: 'item',
        key: 'ai-tab-graph',
        icon: Network,
        label: 'Tab DNA overlay',
        shortcut: isMac ? '⌘ ⇧ G' : 'Ctrl ⇧ G',
        onSelect: () => void openTabGraph(),
      },
    ];
  }, [isMac, navigate, onAgentToggle, onClipperToggle, onCommandPalette, onReaderToggle, openTabGraph]);

  const toolsMenuEntries = useMemo<MenuEntry[]>(() => {
    return [
      {
        type: 'label',
        key: 'tools-label',
        label: 'Utilities & privacy',
        description: 'One-tap tools and live privacy controls',
      },
      {
        type: 'item',
        key: 'tools-find',
        icon: Search,
        label: 'Find in page',
        shortcut: isMac ? '⌘ F' : 'Ctrl F',
        disabled: !activeId,
        onSelect: handleFindInPage,
      },
      {
        type: 'item',
        key: 'tools-screenshot',
        icon: Camera,
        label: 'Capture screenshot',
        disabled: !activeId,
        onSelect: handleScreenshot,
      },
      {
        type: 'item',
        key: 'tools-pip',
        icon: PictureInPicture,
        label: 'Picture-in-Picture',
        disabled: !activeId,
        onSelect: handlePIP,
      },
      {
        type: 'item',
        key: 'tools-devtools',
        icon: Code,
        label: 'Toggle DevTools',
        shortcut: isMac ? '⌘ ⇧ I' : 'Ctrl ⇧ I',
        disabled: !activeId,
        onSelect: handleToggleDevtools,
      },
      { type: 'separator', key: 'tools-separator-utilities' },
      {
        type: 'item',
        key: 'tools-consent',
        icon: Shield,
        label: 'Consent ledger',
        onSelect: () => void openConsentDashboard(),
      },
      {
        type: 'item',
        key: 'tools-onboarding',
        icon: Workflow,
        label: 'Replay onboarding tour',
        onSelect: () => resetOnboarding(),
      },
      {
        type: 'item',
        key: 'tools-network-controls',
        icon: Wifi,
        label: 'Network controls',
        onSelect: () => {
          const target = document.querySelector('[data-network-button]') as HTMLElement | null;
          target?.click();
        },
      },
      {
        type: 'item',
        key: 'tools-shields',
        icon: Shield,
        label: 'Privacy shields',
        onSelect: () => {
          const target = document.querySelector('[data-shields-button]') as HTMLElement | null;
          target?.click();
        },
      },
      {
        type: 'item',
        key: 'tools-tor',
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
        key: 'tools-new-identity',
        icon: RefreshCw,
        label: 'Tor: New identity',
        disabled: !torStatus.running || Boolean(torStatus.stub),
        onSelect: () => {
          if (torStatus.running && !torStatus.stub) {
            void newTorIdentity();
          }
        },
      },
      {
        type: 'item',
        key: 'tools-vpn',
        icon: Wifi,
        label: vpnStatus.connected
          ? `VPN: ${vpnStatus.type ? vpnStatus.type.toUpperCase() : 'Active'}`
          : 'Check VPN status',
        onSelect: () => {
          void checkVpn();
        },
      },
    ];
  }, [
    activeId,
    checkVpn,
    handleFindInPage,
    handlePIP,
    handleScreenshot,
    handleToggleDevtools,
    isMac,
    openConsentDashboard,
    resetOnboarding,
    startTor,
    stopTor,
    torStatus,
    vpnStatus,
    newTorIdentity,
  ]);

  const renderDropdownMenuItems = useCallback(
    (entries: MenuEntry[]) =>
      entries.map((entry) => {
        if (entry.type === 'label') {
          return (
            <DropdownMenuLabel key={entry.key} className="px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-muted/80">
              <div className="font-semibold text-muted/90">{entry.label}</div>
              {entry.description && (
                <div className="mt-1 text-[11px] normal-case tracking-normal text-muted/70">{entry.description}</div>
              )}
            </DropdownMenuLabel>
          );
        }
        if (entry.type === 'separator') {
          return <DropdownMenuSeparator key={entry.key} />;
        }
        return (
          <DropdownMenuItem
            key={entry.key}
            className="menu-item w-full rounded-lg"
            disabled={entry.disabled}
            onSelect={() => handleMenuSelect(entry)}
          >
            {entry.icon ? <entry.icon size={16} className="text-muted" /> : null}
            <span className="flex-1 text-left">{entry.label}</span>
            {entry.shortcut && <DropdownMenuShortcut>{entry.shortcut}</DropdownMenuShortcut>}
          </DropdownMenuItem>
        );
      }),
    [handleMenuSelect],
  );

  const renderMenu = useCallback(
    (menu: MenuKey, label: string, Icon: LucideIcon, entries: MenuEntry[]) => {
      const isOpen = menuOpen[menu];
      const iconClass = isOpen ? 'text-primary' : 'text-muted';
      return (
        <DropdownMenu key={menu} open={menuOpen[menu]} onOpenChange={handleMenuOpenChange(menu)}>
          <DropdownMenuTrigger asChild>
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                isOpen ? 'bg-white/12 text-primary shadow-[0_10px_30px_rgba(59,130,246,0.28)]' : 'text-muted hover:bg-white/10 hover:text-primary'
              }`}
              title={`${label} menu`}
              data-testid={`nav-menu-${menu}`}
            >
              <Icon size={16} className={iconClass} />
              <span className="hidden xl:inline">{label}</span>
              <ChevronDown size={14} className="hidden md:inline" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {renderDropdownMenuItems(entries)}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    [handleMenuOpenChange, menuOpen, renderDropdownMenuItems],
  );

  const handleCompactSelect = useCallback(
    (entry: Extract<MenuEntry, { type: 'item' }>) => {
      handleMenuSelect(entry);
      setCompactMenuOpen(false);
    },
    [handleMenuSelect],
  );

  return (
    <div className="drag border-b border-white/5 bg-surface/95 supports-[backdrop-filter:blur(12px)]:backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,42,0.45)] text-primary transition-colors">
      <div className="no-drag flex flex-wrap items-center gap-3 px-3 py-2">
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <ModeSwitch />
          <SessionSwitcher compact />
          <div className="hidden 2xl:block">
            <WorkspaceSwitcher compact />
          </div>
          <div className="hidden 3xl:flex items-center gap-2">
            <ProfileQuickSwitcher compact />
            <ContainerSwitcher compact />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 rounded-full border border-white/5 bg-white/5 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <motion.button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack}
            whileHover={canGoBack ? { scale: 1.05 } : {}}
            whileTap={canGoBack ? { scale: 0.95 } : {}}
            className={`p-1.5 rounded-full transition-colors ${
              canGoBack
                ? 'text-primary hover:bg-white/10 cursor-pointer'
                : 'text-muted/40 cursor-not-allowed opacity-50'
            }`}
            title="Back (Alt+←)"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </motion.button>
          <motion.button
            type="button"
            onClick={handleForward}
            disabled={!canGoForward}
            whileHover={canGoForward ? { scale: 1.05 } : {}}
            whileTap={canGoForward ? { scale: 0.95 } : {}}
            className={`p-1.5 rounded-full transition-colors ${
              canGoForward
                ? 'text-primary hover:bg-white/10 cursor-pointer'
                : 'text-muted/40 cursor-not-allowed opacity-50'
            }`}
            title="Forward (Alt+→)"
            aria-label="Go forward"
          >
            <ArrowRight size={16} />
          </motion.button>
          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={!activeId}
            whileHover={activeId ? { scale: 1.05, rotate: isLoading ? 180 : 0 } : {}}
            whileTap={activeId ? { scale: 0.95 } : {}}
            className={`p-1.5 rounded-full transition-colors ${
              activeId
                ? 'text-primary hover:bg-white/10 cursor-pointer'
                : 'text-muted/40 cursor-not-allowed opacity-50'
            }`}
            title="Reload (Ctrl+R)"
            aria-label="Reload page"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden lg:flex p-1.5 rounded-full text-primary hover:bg-white/10 transition-colors cursor-pointer"
            title="Go home (Alt+1)"
            aria-label="Go to home"
          >
            <Home size={16} />
          </motion.button>
        </div>

        <div className="flex-1 min-w-[220px] basis-full sm:basis-auto" data-onboarding="omnibox">
          <div className="relative">
            <Omnibox ref={omniboxRef} onCommandPalette={onCommandPalette} />
            <ProgressBar />
          </div>
        </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-1">
          {/* Consolidated menus - show on larger screens */}
          <div className="hidden xl:flex items-center gap-1.5">
            {renderMenu('file', 'File', FileText, fileMenuEntries)}
            {renderMenu('ai', 'AI', Sparkles, aiMenuEntries)}
            {renderMenu('tools', 'Tools', Workflow, toolsMenuEntries)}
          </div>

          {/* Compact action buttons - grouped by function */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {/* AI/Agent actions */}
            <motion.button
              onClick={onAgentToggle}
              aria-label={`Agent console${agentActive ? ' (active)' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="nav-agent-button"
              className={`relative p-2 rounded-full transition-colors ${
                agentActive
                  ? 'bg-primary/15 text-primary shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                  : 'text-muted hover:bg-white/10 hover:text-primary'
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
            
            {/* Privacy controls - consolidated */}
            <div className="hidden lg:flex items-center gap-1">
              <PrivacySentinelBadge />
            </div>
            <div className="hidden 2xl:flex items-center gap-1">
              <ShieldsButton />
              <NetworkButton />
            </div>
            
            {/* Theme switcher */}
            <ThemeSwitcher />
          </div>

          {/* Compact menu for smaller screens - shows all items */}
          <div className="xl:hidden relative" ref={compactMenuRef}>
            <button
              type="button"
              onClick={() => setCompactMenuOpen((prev) => !prev)}
              className="p-2 rounded-full text-muted transition-colors hover:bg-white/10 hover:text-primary"
              aria-label="Navigation menu"
              aria-expanded={compactMenuOpen}
              data-testid="nav-compact-button"
              title="Navigation menu"
            >
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {compactMenuOpen && (
                <>
                  <motion.button
                    key="compact-backdrop"
                    type="button"
                    aria-label="Close navigation menu"
                    className="fixed inset-0 z-40 bg-transparent pointer-events-auto focus:outline-none"
                    onClick={() => setCompactMenuOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    key="compact-menu"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/5 bg-surface-elevated/95 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl z-50 py-2"
                  >
                    {[
                      { key: 'file', label: 'File', entries: fileMenuEntries },
                      { key: 'ai', label: 'AI', entries: aiMenuEntries },
                      { key: 'tools', label: 'Tools', entries: toolsMenuEntries },
                    ].map((section) => {
                      const items = section.entries.filter(
                        (entry): entry is Extract<MenuEntry, { type: 'item' }> => entry.type === 'item',
                      );
                      if (items.length === 0) {
                        return null;
                      }

                      return (
                        <div key={section.key} className="px-3 py-2">
                          <div className="px-1 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted/70">
                            {section.label}
                          </div>
                          <div className="space-y-1">
                            {items.map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleCompactSelect(item)}
                                disabled={item.disabled}
                                className={`menu-item w-full rounded-xl ${
                                  item.disabled ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                              >
                                {item.icon ? <item.icon size={16} className="text-muted" /> : null}
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.shortcut && (
                                  <kbd className="text-xs text-muted border border-surface rounded px-1.5 py-0.5">
                                    {item.shortcut}
                                  </kbd>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <RedixQuickDialog
        open={redixDialogOpen}
        onClose={() => setRedixDialogOpen(false)}
      />
    </div>
  );
}

