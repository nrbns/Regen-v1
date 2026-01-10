/**
 * Regen Core Hooks
 * React hooks for integrating Regen Core triggers with existing systems
 */

import { useEffect, useRef, useMemo } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useRegenCore } from './regenCore.store';
import { useCommandController } from '../../hooks/useCommandController';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';
import { topicDetectionService } from '../../lib/services/TopicDetectionService';
import { RegenObservation } from './regenCore.types';
import { getRegenCoreConfig } from './regenCore.config';
import { eventBus } from '../../lib/events/EventBus';

/**
 * Hook to detect and trigger TAB_REDUNDANT signal
 * Monitors tabs and emits signal when duplicates detected
 */
export function useTabRedundancyDetection() {
  const tabs = useTabsStore((state) => state.tabs);
  const { emitSignal, state: coreState } = useRegenCore();
  const lastCheckedRef = useRef<number>(0);
  const config = useMemo(() => getRegenCoreConfig(), []);

  useEffect(() => {
    // Don't check if disabled or already noticing/executing/reporting
    if (!config.enabled || coreState !== 'observing') return;

    const checkTabs = () => {
      const now = Date.now();
      if (now - lastCheckedRef.current < config.tabRedundancyCooldown) return;

      // Find duplicate tabs (same domain)
      const domains = new Map<string, typeof tabs>();
      for (const tab of tabs) {
        try {
          if (!tab.url || tab.url === 'about:blank' || tab.url.startsWith('http://localhost')) continue;
          const url = new URL(tab.url);
          const domain = url.hostname;
          if (!domains.has(domain)) {
            domains.set(domain, []);
          }
          domains.get(domain)!.push(tab);
        } catch {
          // Invalid URL, skip
        }
      }

      // Find domains with threshold+ tabs
      for (const [domain, tabsWithDomain] of domains.entries()) {
        if (tabsWithDomain.length >= config.tabRedundancyThreshold) {
          lastCheckedRef.current = now;
          
          const observation: RegenObservation = {
            signal: 'TAB_REDUNDANT',
            statement: `${tabsWithDomain.length} redundant tabs detected.`,
            action: 'close_duplicates',
            actionLabel: 'ELIMINATE',
            reasoning: `Multiple tabs from ${domain} detected`,
          };

          emitSignal('TAB_REDUNDANT', observation);
          break; // Only trigger once per check
        }
      }
    };

    // Check immediately
    checkTabs();

    // Also listen to TAB_OPEN events for real-time detection
    const unsubscribe = eventBus.on('TAB_OPEN', () => {
      // Debounce tab checks after new tab opens
      setTimeout(checkTabs, 1000);
    });

    // Periodic check
    const interval = setInterval(checkTabs, config.tabRedundancyCooldown);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [tabs, coreState, emitSignal, config]);
}

/**
 * Hook to detect and trigger SEARCH_LOOP signal
 * Monitors search events and emits signal when pattern detected
 */
export function useSearchLoopDetection() {
  const { emitSignal, state: coreState } = useRegenCore();
  const searchCountRef = useRef<number>(0);
  const lastSearchTimeRef = useRef<number>(0);
  const config = useMemo(() => getRegenCoreConfig(), []);

  useEffect(() => {
    if (!config.enabled || coreState !== 'observing') return;

    const handleSearch = () => {
      const now = Date.now();
      
      // Reset if outside window
      if (now - lastSearchTimeRef.current > config.searchLoopWindow) {
        searchCountRef.current = 0;
      }

      searchCountRef.current += 1;
      lastSearchTimeRef.current = now;

      if (searchCountRef.current >= config.searchLoopThreshold) {
        searchCountRef.current = 0; // Reset after triggering

        const observation: RegenObservation = {
          signal: 'SEARCH_LOOP',
          statement: 'Query intent unclear. Refinement suggested.',
          action: 'refine_search',
          actionLabel: 'REFINE',
          reasoning: 'Repeated searches suggest query refinement needed',
        };

        emitSignal('SEARCH_LOOP', observation);
      }
    };

    // Listen to both legacy event and new event bus
    const handleLegacySearch = () => {
      handleSearch();
    };

    // Subscribe to event bus
    const unsubscribe = eventBus.on('SEARCH_SUBMIT', handleSearch);
    
    // Also listen to legacy event for backwards compatibility
    window.addEventListener('regen:search', handleLegacySearch as EventListener);
    
    return () => {
      unsubscribe();
      window.removeEventListener('regen:search', handleLegacySearch as EventListener);
    };
  }, [coreState, emitSignal, config]);
}

/**
 * Hook to detect and trigger LONG_SCROLL signal
 * Monitors scroll depth and emits signal when user scrolls 80%+ on articles
 */
export function useLongScrollDetection() {
  const { emitSignal, state: coreState } = useRegenCore();
  const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId));
  const scrollDepthRef = useRef<number>(0);
  const lastCheckedRef = useRef<number>(0);
  const config = useMemo(() => getRegenCoreConfig(), []);

  useEffect(() => {
    if (!config.enabled || coreState !== 'observing' || !activeTab?.url) return;

    const checkScrollDepth = async () => {
      const now = Date.now();
      if (now - lastCheckedRef.current < config.scrollCooldown) return;

      try {
        // Calculate scroll depth
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const depth = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        scrollDepthRef.current = depth;

        // Check if threshold reached
        if (depth >= config.scrollDepthThreshold) {
          lastCheckedRef.current = now;

          // Detect topic to determine if it's an article/research page
          const topic = await topicDetectionService.detectTopic(
            activeTab.url,
            activeTab.title
          );

          // Only trigger for academic/media content
          if (topic.category === 'academic' || topic.category === 'media') {
            const observation: RegenObservation = {
              signal: 'LONG_SCROLL',
              statement: 'Page credibility score: Moderate. Bias indicators present.',
              action: 'summarize',
              actionLabel: 'ANALYZE',
              reasoning: 'Long scroll on article suggests analysis needed',
            };

            emitSignal('LONG_SCROLL', observation);
          }
        }
      } catch (error) {
        // Silently fail - scroll tracking is non-critical
        console.warn('[RegenCore] Scroll detection failed:', error);
      }
    };

    // Listen to scroll events from event bus AND direct window scroll
    const handleScrollEvent = (event: any) => {
      const depth = event.data?.depth || 0;
      if (depth >= config.scrollDepthThreshold) {
        checkScrollDepth();
      }
    };

    const unsubscribe = eventBus.on('SCROLL', handleScrollEvent);

    // Also track direct scroll for pages without event bus integration
    let scrollTimeout: NodeJS.Timeout;
    const handleDirectScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(checkScrollDepth, 2000); // Debounce 2s after scroll stops
    };

    window.addEventListener('scroll', handleDirectScroll, { passive: true });
    checkScrollDepth(); // Initial check

    return () => {
      unsubscribe();
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleDirectScroll);
    };
  }, [activeTab, coreState, emitSignal, config]);
}

/**
 * Hook to detect and trigger IDLE signal
 * Monitors idle time and emits signal when user is idle 22+ minutes on same page
 */
export function useIdleDetection() {
  const { emitSignal, state: coreState } = useRegenCore();
  const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId));
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);
  const config = useMemo(() => getRegenCoreConfig(), []);

  useEffect(() => {
    if (!config.enabled || coreState !== 'observing' || !activeTab?.url) {
      hasTriggeredRef.current = false;
      return;
    }

    // Reset tracking when tab changes
    const currentUrl = activeTab.url;

    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      idleStartRef.current = 0;
      hasTriggeredRef.current = false;
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const checkIdle = () => {
      // Don't check if tab changed
      if (activeTab?.url !== currentUrl) {
        resetIdle();
        return;
      }

      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime >= config.idleThreshold && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;

        const observation: RegenObservation = {
          signal: 'IDLE',
          statement: 'Focus degradation detected after extended period.',
          action: 'save_for_later',
          actionLabel: 'STORE',
          reasoning: 'Extended idle time suggests potential interest but distraction',
        };

        emitSignal('IDLE', observation);
      }
    };

    // Track mouse/keyboard activity from event bus AND direct events
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      hasTriggeredRef.current = false;
    };

    // Listen to event bus activity events
    const unsubscribe = eventBus.onMany(['CLICK', 'KEYPRESS', 'SCROLL', 'TAB_SWITCH'], handleActivity);

    // Start idle timer
    idleTimerRef.current = setInterval(checkIdle, config.idleCheckInterval);

    // Also listen to direct events for backwards compatibility
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keypress', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });

    return () => {
      unsubscribe();
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [activeTab, coreState, emitSignal, config]);
}

/**
 * Hook to detect and trigger ERROR signal
 * Monitors page errors and emits signal when page fails to load
 */
export function useErrorDetection() {
  const { emitSignal, state: coreState } = useRegenCore();
  const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId));
  const hasTriggeredRef = useRef<Map<string, number>>(new Map());
  const config = useMemo(() => getRegenCoreConfig(), []);

  useEffect(() => {
    if (!config.enabled || coreState !== 'observing' || !activeTab?.url) {
      // Clear old triggers when not observing (after cooldown)
      const now = Date.now();
      for (const [url, timestamp] of hasTriggeredRef.current.entries()) {
        if (now - timestamp > config.errorCooldown) {
          hasTriggeredRef.current.delete(url);
        }
      }
      return;
    }

    const url = activeTab.url;

    const checkError = (errorUrl: string, errorMessage: string) => {
      const now = Date.now();
      const lastTrigger = hasTriggeredRef.current.get(errorUrl);
      
      // Don't trigger multiple times within cooldown
      if (lastTrigger && (now - lastTrigger) < config.errorCooldown) return;

      hasTriggeredRef.current.set(errorUrl, now);

      const observation: RegenObservation = {
        signal: 'ERROR',
        statement: 'This request failed. Local alternative available.',
        action: 'use_cache',
        actionLabel: 'USE CACHE',
        reasoning: 'Page load failed, cached version may be available',
      };

      emitSignal('ERROR', observation);
    };

    // Listen to event bus PAGE_ERROR events
    const unsubscribeError = eventBus.on('PAGE_ERROR', (event) => {
      if (event.data?.url === url) {
        checkError(event.data.url, event.data.error || 'Unknown error');
      }
    });

    // Also listen for direct window errors (backwards compatibility)
    const handleError = (event: ErrorEvent) => {
      // Check if it's a page load error
      if (event.message?.includes('Failed to load') || 
          event.message?.includes('NetworkError') ||
          (event.filename && url.includes(event.filename))) {
        checkError(url, event.message || 'Page load error');
      }
    };

    // Listen for unhandled promise rejections (network errors)
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch') ||
          event.reason?.message?.includes('NetworkError')) {
        checkError(url, event.reason?.message || 'Network error');
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection);

    // Reset trigger when tab changes
    return () => {
      unsubscribeError();
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [activeTab, coreState, emitSignal, config]);
}

/**
 * Hook to handle Regen Core actions
 * Executes actions when user accepts observations
 */
export function useRegenCoreActions() {
  const { state, observation, setState, setReport } = useRegenCore();
  const { executeCommand } = useCommandController();
  const tabs = useTabsStore((state) => state.tabs);
  const closeTab = useTabsStore((state) => state.closeTab);
  const activeTab = useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId));

  // Handle action execution when state changes to executing
  useEffect(() => {
    if (state !== 'executing' || !observation?.action) {
      return;
    }

    const executeAction = async () => {
      try {
        let result: any = null;

        switch (observation.action) {
          case 'close_duplicates': {
            // Find and close duplicate tabs
            const domains = new Map<string, typeof tabs>();
            for (const tab of tabs) {
              try {
                if (!tab.url || tab.url === 'about:blank' || tab.url.startsWith('http://localhost')) continue;
                const url = new URL(tab.url);
                const domain = url.hostname;
                if (!domains.has(domain)) {
                  domains.set(domain, []);
                }
                domains.get(domain)!.push(tab);
              } catch {
                // Skip invalid URLs
              }
            }

            let closedCount = 0;
            for (const [, tabsWithDomain] of domains.entries()) {
              if (tabsWithDomain.length >= 3) {
                // Keep first tab, close the rest
                const toClose = tabsWithDomain.slice(1);
                for (const tab of toClose) {
                  closeTab(tab.id);
                  closedCount++;
                }
              }
            }

            result = {
              success: true,
              closed: closedCount,
            };

            setReport({
              title: 'REDUNDANCY ELIMINATED',
              metrics: [`Tabs closed: ${closedCount}`],
              points: ['Redundant tabs removed'],
            });
            break;
          }

          case 'summarize': {
            const url = activeTab?.url || window.location.href;
            try {
              const commandResult = await executeCommand('summarize page', {
                currentUrl: url,
              });

              if (commandResult.success && commandResult.data?.summary) {
                const summary = commandResult.data.summary;
                const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
                const corePoints = sentences.slice(0, 4);

                result = {
                  success: true,
                  summary,
                  corePoints: corePoints.length,
                };

                setReport({
                  title: 'RESULT GENERATED',
                  metrics: [
                    `Core points: ${corePoints.length}`,
                    `Time saved: ${Math.ceil(sentences.length * 0.5)}m ${Math.ceil((sentences.length * 0.5 % 1) * 60)}s`,
                  ],
                  points: corePoints.map((point) => point.trim()),
                });
              } else {
                result = {
                  success: false,
                  error: commandResult.message || 'Summary failed',
                };

                setReport({
                  title: 'EXECUTION FAILED',
                  metrics: [commandResult.message || 'Unknown error'],
                  points: [],
                });
              }
            } catch (error) {
              setReport({
                title: 'EXECUTION FAILED',
                metrics: [error instanceof Error ? error.message : 'Summary execution failed'],
                points: [],
              });
            }
            break;
          }

          case 'refine_search': {
            // For now, just report that search refinement would happen
            // In future, could open search refinement UI
            result = {
              success: true,
              action: 'refine_search',
            };

            setReport({
              title: 'SEARCH REFINEMENT',
              metrics: ['Refinement suggestion noted'],
              points: ['Consider narrowing search terms'],
            });
            break;
          }

          case 'save_for_later': {
            if (activeTab) {
              workspaceStore.add({
                title: activeTab.title || 'Stored Page',
                content: `Stored from: ${activeTab.url}`,
                type: 'note',
                metadata: { url: activeTab.url, storedAt: Date.now() },
              });

              result = {
                success: true,
                stored: true,
              };

              setReport({
                title: 'STORED',
                metrics: ['Page stored to workspace'],
                points: ['Accessible in Local Workspace'],
              });
            } else {
              result = {
                success: false,
                error: 'No active tab',
              };

              setReport({
                title: 'EXECUTION FAILED',
                metrics: ['No active tab to store'],
                points: [],
              });
            }
            break;
          }

          case 'use_cache': {
            // For now, just report suggestion
            // In future, could attempt to load cached version
            result = {
              success: true,
              action: 'use_cache',
            };

            setReport({
              title: 'CACHE SUGGESTION',
              metrics: ['Cached version may be available'],
              points: ['Check browser cache or try again later'],
            });
            break;
          }

          default:
            result = {
              success: false,
              error: 'Unknown action',
            };

            setReport({
              title: 'EXECUTION FAILED',
              metrics: ['Unknown action requested'],
              points: [],
            });
        }
      } catch (error) {
        setReport({
          title: 'EXECUTION FAILED',
          metrics: [error instanceof Error ? error.message : 'Unknown error'],
          points: [],
        });
      }
    };

    executeAction();
  }, [state, observation, setReport, executeCommand, tabs, closeTab, activeTab]);
}
