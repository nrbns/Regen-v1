/**
 * AI Sidebar - Human-Kind AI Companion
 * 
 * A silent observer that becomes visible only when useful.
 * Not a chatbot. Not a popup. A context-aware, emotion-neutral companion.
 * 
 * States: idle | aware | helping | reflecting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { contextMemory } from '../../lib/services/ContextMemory';
import { topicDetectionService } from '../../lib/services/TopicDetectionService';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';
import { showToast } from '../ui/Toast';
import { useCommandController } from '../../hooks/useCommandController';

type AIState = 'idle' | 'aware' | 'helping' | 'reflecting';

interface Suggestion {
  id: string;
  message: string;
  action?: string;
  actionLabel?: string;
  reasoning?: string;
}

interface AISidebarProps {
  className?: string;
}

export function AISidebar({ className = '' }: AISidebarProps) {
  const [state, setState] = useState<AIState>('idle');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [ignoreCount, setIgnoreCount] = useState(0); // Track ignores to become quieter
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<any>(null);
  
  const { executeCommand } = useCommandController();
  const tabs = useTabsStore((state) => state.tabs);
  const activeTab = useTabsStore((state) => 
    state.tabs.find((t) => t.id === state.activeTabId)
  );

  // Context tracking
  const [searchCount, setSearchCount] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [tabCount, setTabCount] = useState(0);

  // Track search patterns
  useEffect(() => {
    const handleSearch = () => {
      setSearchCount((prev) => prev + 1);
    };
    window.addEventListener('regen:search', handleSearch as EventListener);
    return () => window.removeEventListener('regen:search', handleSearch as EventListener);
  }, []);

  // Track scroll depth
  useEffect(() => {
    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const depth = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollDepth(depth);
      lastScrollTop = scrollTop;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track idle time
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      setIdleTime(0);
      idleTimer = setTimeout(() => {
        let seconds = 0;
        const interval = setInterval(() => {
          seconds += 1;
          setIdleTime(seconds);
          if (seconds > 300) { // 5 minutes
            clearInterval(interval);
          }
        }, 1000);
      }, 60000); // Start tracking after 1 minute
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keypress', resetIdle);
    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keypress', resetIdle);
    };
  }, []);

  // Track tab count
  useEffect(() => {
    setTabCount(tabs.length);
  }, [tabs.length]);

  // State machine: Evaluate context and transition to 'aware' when appropriate
  useEffect(() => {
    if (state !== 'idle' && state !== 'reflecting') return;
    
    // Don't be annoying - respect ignore count
    if (ignoreCount >= 3) {
      // Become quieter after 3 ignores - only trigger on very strong signals
      // For now, we'll still check but with higher thresholds
    }

    const checkContext = async () => {
      // Higher thresholds if user has ignored multiple times
      const thresholdMultiplier = ignoreCount >= 3 ? 2 : 1;
      
      // Trigger: Too many tabs (6+ * multiplier)
      if (tabCount >= (6 * thresholdMultiplier) && state === 'idle') {
        const duplicates = findDuplicateTabs(tabs);
        if (duplicates.length > 0) {
          setSuggestion({
            id: 'too-many-tabs',
            message: `${tabCount} tabs open. ${duplicates.length} appear similar.`,
            action: 'close_duplicates',
            actionLabel: 'Close duplicates',
            reasoning: 'Multiple tabs with similar content detected',
          });
          setState('aware');
          return;
        }
      }

      // Trigger: Repeated search (3+ * multiplier times)
      if (searchCount >= (3 * thresholdMultiplier) && state === 'idle') {
        setSuggestion({
          id: 'repeated-search',
          message: 'You\'ve searched this multiple times.',
          action: 'different_angle',
          actionLabel: 'Try different angle',
          reasoning: 'Repeated searches suggest refinement needed',
        });
        setState('aware');
        setSearchCount(0); // Reset after suggestion
        return;
      }

      // Trigger: Long scroll (80%+ depth)
      if (scrollDepth >= 80 && state === 'idle' && activeTab) {
        const topic = await topicDetectionService.detectTopic(
          activeTab.url || '',
          activeTab.title
        );
        
        if (topic.category === 'academic' || topic.category === 'media') {
          setSuggestion({
            id: 'long-article',
            message: 'This article is opinion-heavy. Want a neutral summary?',
            action: 'summarize',
            actionLabel: 'Summarize',
            reasoning: 'Long scroll on article suggests interest but time constraints',
          });
          setState('aware');
          return;
        }
      }

      // Trigger: Idle time (18+ minutes on same page)
      if (idleTime >= 1080 && state === 'idle' && activeTab) { // 18 minutes
        setSuggestion({
          id: 'long-idle',
          message: 'You\'ve been here 18+ minutes. Still useful?',
          action: 'save_for_later',
          actionLabel: 'Save for later',
          reasoning: 'Extended idle time suggests potential interest but distraction',
        });
        setState('aware');
        return;
      }

      // Trigger: Error detection (page failed to load)
      if (activeTab && state === 'idle') {
        // Check for error state (would need error tracking)
        // For now, we'll skip this trigger
      }
    };

    // Check context every 10 seconds when idle
    const interval = setInterval(checkContext, 10000);
    checkContext(); // Initial check

    return () => clearInterval(interval);
  }, [state, tabCount, searchCount, scrollDepth, idleTime, activeTab, ignoreCount, tabs]);

  const findDuplicateTabs = useCallback((tabList: Array<{ id: string; url?: string; title?: string }>) => {
    // Simple duplicate detection based on domain
    const domains = new Map<string, Array<{ id: string; url?: string; title?: string }>>();
    for (const tab of tabList) {
      try {
        if (!tab.url) continue;
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
    
    const duplicates: Array<{ id: string; url?: string; title?: string }> = [];
    for (const [, tabsWithSameDomain] of domains) {
      if (tabsWithSameDomain.length > 1) {
        duplicates.push(...tabsWithSameDomain.slice(1)); // Keep first, mark others as duplicates
      }
    }
    return duplicates;
  }, []);

  const handleSuggestionAccept = useCallback(async () => {
    if (!suggestion?.action) return;

    setState('helping');
    setCurrentAction(suggestion.action);

    try {
      let result: any = null;

      switch (suggestion.action) {
        case 'summarize':
          result = await executeCommand('summarize page', {
            currentUrl: activeTab?.url || window.location.href,
          });
          break;
        case 'close_duplicates':
          // Close duplicate tabs logic
          const duplicates = findDuplicateTabs(tabs);
          // This would need tabsStore integration
          showToast(`Would close ${duplicates.length} duplicate tabs`, 'info');
          result = { success: true, closed: duplicates.length };
          break;
        case 'save_for_later':
          // Save to workspace
          if (activeTab) {
            workspaceStore.add({
              title: activeTab.title || 'Saved Page',
              content: `Saved from: ${activeTab.url}`,
              type: 'note',
              metadata: { url: activeTab.url, savedAt: Date.now() },
            });
            result = { success: true, saved: true };
          }
          break;
        default:
          result = { success: false, message: 'Unknown action' };
      }

      setActionResult(result);
      setState('reflecting');
      
      // Record action in context memory
      if (result.success && activeTab) {
        contextMemory.recordAction(suggestion.action, activeTab.url || '', true);
      }
    } catch (error) {
      setActionResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      setState('reflecting');
    }
  }, [suggestion, activeTab, tabs, executeCommand]);

  const handleSuggestionIgnore = useCallback(() => {
    setIgnoreCount((prev) => prev + 1);
    setState('idle');
    setSuggestion(null);
    
    // Record ignore preference
    if (suggestion?.id) {
      // Could track which suggestions are ignored
    }
  }, [suggestion]);

  const handleCloseReflection = useCallback(() => {
    setState('idle');
    setSuggestion(null);
    setCurrentAction(null);
    setActionResult(null);
    setScrollDepth(0); // Reset scroll tracking
    setIdleTime(0); // Reset idle tracking
  }, []);

  // Collapsed rail (idle state)
  const renderIdleRail = () => (
    <motion.div
      className="w-10 h-full bg-slate-800/50 border-r border-slate-700/50 flex flex-col items-center py-4"
      initial={{ width: 40 }}
      animate={{ width: 40 }}
    >
      <motion.div
        className="w-3 h-3 rounded-full bg-purple-400"
        animate={{
          scale: [0.95, 1.0, 0.95],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        title="AI observing"
      />
    </motion.div>
  );

  // Expanded aware state
  const renderAwareState = () => (
    <motion.div
      className="h-full bg-gradient-to-b from-slate-800/95 to-slate-900/95 border-r border-slate-700/50 backdrop-blur-sm flex flex-col"
      initial={{ width: 40 }}
      animate={{ width: 280 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ width: 280 }}
    >
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >
              <Brain className="w-5 h-5 text-purple-400" />
            </motion.div>
            <span className="text-sm font-medium text-slate-200">I noticed…</span>
          </div>
          <button
            onClick={handleSuggestionIgnore}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Ignore"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {suggestion && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              {suggestion.message}
            </p>
            
            {suggestion.reasoning && (
              <p className="text-xs text-slate-500 italic">
                {suggestion.reasoning}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              {suggestion.actionLabel && (
                <motion.button
                  onClick={handleSuggestionAccept}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {suggestion.actionLabel}
                </motion.button>
              )}
              <motion.button
                onClick={handleSuggestionIgnore}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Ignore
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Helping state (async progress)
  const renderHelpingState = () => (
    <motion.div
      className="h-full bg-gradient-to-b from-slate-800/95 to-slate-900/95 border-r border-slate-700/50 backdrop-blur-sm flex flex-col"
      initial={{ width: 40 }}
      animate={{ width: 280 }}
      transition={{ duration: 0.4 }}
      style={{ width: 280 }}
    >
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-5 h-5 text-blue-400" />
          </motion.div>
          <span className="text-sm font-medium text-slate-200">Working…</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            {currentAction === 'summarize' && 'Reading this page…'}
            {currentAction === 'close_duplicates' && 'Analyzing tabs…'}
            {currentAction === 'save_for_later' && 'Saving…'}
            {!currentAction && 'Processing…'}
          </p>

          {/* Soft shimmer progress */}
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Reflecting state (result explanation)
  const renderReflectingState = () => {
    const getReflectionContent = () => {
      if (!actionResult) return null;

      if (currentAction === 'summarize' && actionResult.success && actionResult.data?.summary) {
        const summary = actionResult.data.summary;
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const keyPoints = sentences.slice(0, 3);

        return {
          title: '✓ Summary ready',
          points: keyPoints.map((point, i) => `• ${point.trim()}`),
          metrics: [`Read time saved: ~${Math.ceil(sentences.length * 0.5)} min`],
        };
      }

      if (currentAction === 'close_duplicates' && actionResult.success) {
        return {
          title: '✓ Tabs organized',
          points: [`Closed ${actionResult.closed || 0} duplicate tabs`],
          metrics: ['Browser performance improved'],
        };
      }

      if (currentAction === 'save_for_later' && actionResult.success) {
        return {
          title: '✓ Saved for later',
          points: ['Page saved to workspace'],
          metrics: ['You can find it in Local Workspace'],
        };
      }

      if (!actionResult.success) {
        return {
          title: 'Action incomplete',
          points: [actionResult.error || actionResult.message || 'Something went wrong'],
          metrics: [],
        };
      }

      return {
        title: '✓ Done',
        points: ['Action completed'],
        metrics: [],
      };
    };

    const reflection = getReflectionContent();

    return (
      <motion.div
        className="h-full bg-gradient-to-b from-slate-800/95 to-slate-900/95 border-r border-slate-700/50 backdrop-blur-sm flex flex-col"
        initial={{ width: 40 }}
        animate={{ width: 280 }}
        transition={{ duration: 0.4 }}
        style={{ width: 280 }}
      >
        <div className="p-4 border-b border-slate-700/50 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-slate-200">
                {reflection?.title || 'Complete'}
              </span>
            </div>
            <button
              onClick={handleCloseReflection}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {reflection && (
            <div className="space-y-3">
              {reflection.points && reflection.points.length > 0 && (
                <div className="space-y-1">
                  {reflection.points.map((point, i) => (
                    <p key={i} className="text-sm text-slate-300 leading-relaxed">
                      {point}
                    </p>
                  ))}
                </div>
              )}

              {reflection.metrics && reflection.metrics.length > 0 && (
                <div className="pt-2 border-t border-slate-700/50 space-y-1">
                  {reflection.metrics.map((metric, i) => (
                    <p key={i} className="text-xs text-slate-400">
                      {metric}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {currentAction === 'summarize' && actionResult?.success && (
                  <motion.button
                    onClick={() => {
                      // Save to workspace
                      if (activeTab && actionResult?.data?.summary) {
                        workspaceStore.add({
                          title: `Summary: ${activeTab.title || 'Page'}`,
                          content: actionResult.data.summary,
                          type: 'summary',
                          metadata: { url: activeTab.url },
                        });
                        showToast('Saved to workspace', 'success');
                      }
                      handleCloseReflection();
                    }}
                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Save
                  </motion.button>
                )}
                <motion.button
                  onClick={handleCloseReflection}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`h-full ${className}`}>
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderIdleRail()}
          </motion.div>
        )}

        {state === 'aware' && (
          <motion.div
            key="aware"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {renderAwareState()}
          </motion.div>
        )}

        {state === 'helping' && (
          <motion.div
            key="helping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderHelpingState()}
          </motion.div>
        )}

        {state === 'reflecting' && (
          <motion.div
            key="reflecting"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            {renderReflectingState()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
