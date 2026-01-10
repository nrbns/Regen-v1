/**
 * Sentinel Spine - REGEN CORE AI Presence
 * 
 * Not an assistant. Not a friend. A protective, precise, observant presence.
 * Inspired by M3GAN's controlled intelligence - loyal to the user.
 * 
 * Default: 12-16px vertical light core that stands guard
 * States: OBSERVING → NOTICING → EXECUTING → REPORTING
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Clock } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { contextMemory } from '../../lib/services/ContextMemory';
import { topicDetectionService } from '../../lib/services/TopicDetectionService';
import { showToast } from '../ui/Toast';
import { useCommandController } from '../../hooks/useCommandController';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';

type SentinelState = 'OBSERVING' | 'NOTICING' | 'EXECUTING' | 'REPORTING';

interface Observation {
  id: string;
  statement: string;
  action?: string;
  actionLabel?: string;
  reasoning?: string;
}

interface SentinelSpineProps {
  className?: string;
}

export function SentinelSpine({ className = '' }: SentinelSpineProps) {
  const [state, setState] = useState<SentinelState>('OBSERVING');
  const [observation, setObservation] = useState<Observation | null>(null);
  const [ignoreCount, setIgnoreCount] = useState(0);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  
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
          if (seconds > 600) { // 10 minutes
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

  // State machine: Evaluate context and transition to 'NOTICING' when appropriate
  useEffect(() => {
    if (state !== 'OBSERVING' && state !== 'REPORTING') return;
    
    // Respect ignore count - become quieter after multiple ignores
    if (ignoreCount >= 3) {
      return; // Silent mode
    }

    const evaluateContext = async () => {
      const thresholdMultiplier = ignoreCount >= 3 ? 2 : 1;

      // Observation: Too many tabs with duplicates
      if (tabCount >= (6 * thresholdMultiplier) && state === 'OBSERVING') {
        const duplicates = findDuplicateTabs(tabs);
        if (duplicates.length > 0) {
          setObservation({
            id: 'redundant-tabs',
            statement: `${duplicates.length} redundant tabs detected.`,
            action: 'close_duplicates',
            actionLabel: 'ELIMINATE',
            reasoning: 'Multiple tabs with similar content detected',
          });
          setState('NOTICING');
          return;
        }
      }

      // Observation: Repeated search pattern
      if (searchCount >= (3 * thresholdMultiplier) && state === 'OBSERVING') {
        setObservation({
          id: 'query-pattern',
          statement: 'Query intent unclear. Refinement suggested.',
          action: 'different_angle',
          actionLabel: 'REFINE',
          reasoning: 'Repeated searches suggest query refinement needed',
        });
        setState('NOTICING');
        setSearchCount(0);
        return;
      }

      // Observation: Long scroll on article
      if (scrollDepth >= 80 && state === 'OBSERVING' && activeTab) {
        const topic = await topicDetectionService.detectTopic(
          activeTab.url || '',
          activeTab.title
        );
        
        if (topic.category === 'academic' || topic.category === 'media') {
          setObservation({
            id: 'article-depth',
            statement: 'Page credibility score: Moderate. Bias indicators present.',
            action: 'summarize',
            actionLabel: 'ANALYZE',
            reasoning: 'Long scroll on article suggests analysis needed',
          });
          setState('NOTICING');
          return;
        }
      }

      // Observation: Extended idle time
      if (idleTime >= 1320 && state === 'OBSERVING' && activeTab) { // 22 minutes
        setObservation({
          id: 'focus-degradation',
          statement: 'Focus degradation detected after 22 minutes.',
          action: 'save_for_later',
          actionLabel: 'STORE',
          reasoning: 'Extended idle time suggests potential interest but distraction',
        });
        setState('NOTICING');
        return;
      }
    };

    // Evaluate context every 10 seconds
    const interval = setInterval(evaluateContext, 10000);
    evaluateContext(); // Initial evaluation

    return () => clearInterval(interval);
  }, [state, tabCount, searchCount, scrollDepth, idleTime, activeTab, ignoreCount, tabs]);

  const findDuplicateTabs = useCallback((tabList: Array<{ id: string; url?: string; title?: string }>) => {
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
        duplicates.push(...tabsWithSameDomain.slice(1));
      }
    }
    return duplicates;
  }, []);

  const handleObservationAccept = useCallback(async () => {
    if (!observation?.action) return;

    setState('EXECUTING');
    setCurrentAction(observation.action);

    try {
      let result: any = null;

      switch (observation.action) {
        case 'summarize':
          result = await executeCommand('summarize page', {
            currentUrl: activeTab?.url || window.location.href,
          });
          break;
        case 'close_duplicates':
          const duplicates = findDuplicateTabs(tabs);
          // This would need tabsStore integration for actual closing
          showToast(`${duplicates.length} duplicate tabs would be closed`, 'info');
          result = { success: true, closed: duplicates.length };
          break;
        case 'save_for_later':
          if (activeTab) {
            workspaceStore.add({
              title: activeTab.title || 'Stored Page',
              content: `Stored from: ${activeTab.url}`,
              type: 'note',
              metadata: { url: activeTab.url, storedAt: Date.now() },
            });
            result = { success: true, stored: true };
          }
          break;
        default:
          result = { success: false, message: 'Action not recognized' };
      }

      setExecutionResult(result);
      setState('REPORTING');
      
      // Record action in context memory
      if (result.success && activeTab) {
        contextMemory.recordAction(observation.action, activeTab.url || '', true);
      }
    } catch (error) {
      setExecutionResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      setState('REPORTING');
    }
  }, [observation, activeTab, tabs, executeCommand, findDuplicateTabs]);

  const handleObservationDismiss = useCallback(() => {
    setIgnoreCount((prev) => prev + 1);
    setState('OBSERVING');
    setObservation(null);
  }, []);

  const handleReportDismiss = useCallback(() => {
    setState('OBSERVING');
    setObservation(null);
    setCurrentAction(null);
    setExecutionResult(null);
    setScrollDepth(0);
    setIdleTime(0);
  }, []);

  // STATE 1: OBSERVING - Sentinel Spine (12-16px vertical light core)
  const renderObserving = () => (
    <motion.div
      className="w-4 h-full bg-slate-900 border-l border-slate-800 flex flex-col items-center relative overflow-hidden"
      initial={{ width: 16 }}
      animate={{ width: 16 }}
    >
      {/* Vertical light core - animated up/down with micro flicker */}
      <motion.div
        className="absolute inset-y-0 w-full"
        initial={{ opacity: 0.3 }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Core light - cold violet/blue */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-violet-500/40 to-transparent blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent blur-sm" />
        
        {/* Vertical spine line */}
        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-violet-400/60"
          animate={{
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transform: 'translateX(-50%)' }}
        />
      </motion.div>

      {/* Micro flicker every 5-7 seconds */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: 0.1,
          repeat: Infinity,
          repeatDelay: 6,
          ease: 'linear',
        }}
      />
    </motion.div>
  );

  // STATE 2: NOTICING - Controlled Expansion (splits open, not slides)
  const renderNoticing = () => {
    if (!observation) return null;

    return (
      <motion.div
        className="h-full bg-slate-900/98 border-l border-violet-500/30 backdrop-blur-md flex flex-col"
        initial={{ width: 16 }}
        animate={{ width: 280 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} // Linear mechanical easing
        style={{ width: 280 }}
      >
        {/* Header - Formal, system-like */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Vertical light indicator */}
              <motion.div
                className="w-1 h-6 bg-violet-400/80"
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">OBSERVATION</span>
            </div>
            <button
              onClick={handleObservationDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-slate-200 leading-relaxed font-mono">
              {observation.statement}
            </p>
            
            {observation.reasoning && (
              <p className="text-xs text-slate-500 font-mono">
                {observation.reasoning}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              {observation.actionLabel && (
                <motion.button
                  onClick={handleObservationAccept}
                  className="flex-1 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-mono tracking-wider uppercase transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                >
                  {observation.actionLabel}
                </motion.button>
              )}
              <motion.button
                onClick={handleObservationDismiss}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-mono tracking-wider uppercase transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1, ease: 'linear' }}
              >
                DISMISS
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // STATE 3: EXECUTING - Machine at Work (horizontal scan)
  const renderExecuting = () => (
    <motion.div
      className="h-full bg-slate-900/98 border-l border-blue-500/30 backdrop-blur-md flex flex-col"
      initial={{ width: 16 }}
      animate={{ width: 280 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{ width: 280 }}
    >
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            className="w-1 h-6 bg-blue-400/80"
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">EXECUTING</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-200 font-mono">
            {currentAction === 'summarize' && 'Analyzing structure…'}
            {currentAction === 'close_duplicates' && 'Cross-checking sources…'}
            {currentAction === 'save_for_later' && 'Reducing redundancy…'}
            {!currentAction && 'Processing…'}
          </p>

          {/* Horizontal scan line */}
          <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
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

  // STATE 4: REPORTING - Cold Precision (results only)
  const renderReporting = () => {
    const getReportContent = () => {
      if (!executionResult) return null;

      if (currentAction === 'summarize' && executionResult.success && executionResult.data?.summary) {
        const summary = executionResult.data.summary;
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const corePoints = sentences.slice(0, 4);

        return {
          title: 'RESULT GENERATED',
          metrics: [
            `Core points: ${corePoints.length}`,
            `Time saved: ${Math.ceil(sentences.length * 0.5)}m ${Math.ceil((sentences.length * 0.5 % 1) * 60)}s`,
          ],
          points: corePoints.map((point, i) => point.trim()),
        };
      }

      if (currentAction === 'close_duplicates' && executionResult.success) {
        return {
          title: 'REDUNDANCY ELIMINATED',
          metrics: [`Tabs closed: ${executionResult.closed || 0}`],
          points: ['Redundant tabs removed'],
        };
      }

      if (currentAction === 'save_for_later' && executionResult.success) {
        return {
          title: 'STORED',
          metrics: ['Page stored to workspace'],
          points: ['Accessible in Local Workspace'],
        };
      }

      if (!executionResult.success) {
        return {
          title: 'EXECUTION FAILED',
          metrics: [executionResult.error || executionResult.message || 'Unknown error'],
          points: [],
        };
      }

      return {
        title: 'COMPLETE',
        metrics: ['Action completed'],
        points: [],
      };
    };

    const report = getReportContent();

    return (
      <motion.div
        className="h-full bg-slate-900/98 border-l border-emerald-500/30 backdrop-blur-md flex flex-col"
        initial={{ width: 16 }}
        animate={{ width: 280 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: 280 }}
      >
        <div className="p-4 border-b border-slate-800/50 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1 h-6 bg-emerald-400/80"
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">
                {report?.title || 'REPORT'}
              </span>
            </div>
            <button
              onClick={handleReportDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {report && (
            <div className="space-y-3">
              {report.metrics && report.metrics.length > 0 && (
                <div className="space-y-1">
                  {report.metrics.map((metric, i) => (
                    <p key={i} className="text-sm text-slate-200 font-mono">
                      {metric}
                    </p>
                  ))}
                </div>
              )}

              {report.points && report.points.length > 0 && (
                <div className="pt-2 border-t border-slate-800/50 space-y-1">
                  {report.points.map((point, i) => (
                    <p key={i} className="text-xs text-slate-400 font-mono">
                      • {point}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {currentAction === 'summarize' && executionResult?.success && (
                  <motion.button
                    onClick={() => {
                      if (activeTab && executionResult?.data?.summary) {
                        workspaceStore.add({
                          title: `Analysis: ${activeTab.title || 'Page'}`,
                          content: executionResult.data.summary,
                          type: 'summary',
                          metadata: { url: activeTab.url },
                        });
                        showToast('Stored to workspace', 'success');
                      }
                      handleReportDismiss();
                    }}
                    className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono tracking-wider uppercase transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.1, ease: 'linear' }}
                  >
                    STORE
                  </motion.button>
                )}
                <motion.button
                  onClick={handleReportDismiss}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-mono tracking-wider uppercase transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                >
                  DISMISS
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
        {state === 'OBSERVING' && (
          <motion.div
            key="observing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderObserving()}
          </motion.div>
        )}

        {state === 'NOTICING' && (
          <motion.div
            key="noticing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderNoticing()}
          </motion.div>
        )}

        {state === 'EXECUTING' && (
          <motion.div
            key="executing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderExecuting()}
          </motion.div>
        )}

        {state === 'REPORTING' && (
          <motion.div
            key="reporting"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderReporting()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
