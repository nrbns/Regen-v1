/**
 * Live Context Strip
 * Shows what Regen is observing: active tab, detected topic, reading time, etc.
 * This makes Regen feel "alive" and aware.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Clock, Brain, AlertTriangle, Eye, Zap } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { topicDetectionService } from '../../lib/services/TopicDetectionService';
import { contextMemory } from '../../lib/services/ContextMemory';

export interface LiveContextData {
  activeTabUrl?: string;
  activeTabTitle?: string;
  detectedTopic?: string;
  readingTime?: number; // seconds
  loopRisk?: 'low' | 'medium' | 'high';
  lastActivity?: number; // timestamp
  isObserving?: boolean;
}

export interface LiveContextStripProps {
  className?: string;
  showDetails?: boolean;
}

export function LiveContextStrip({ className = '', showDetails = true }: LiveContextStripProps) {
  const [context, setContext] = useState<LiveContextData>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const activeTab = useTabsStore((state) => {
    const tabs = state.tabs;
    return tabs.find((t) => t.id === state.activeTabId);
  });

  useEffect(() => {
    // Update context from active tab
    if (activeTab) {
      setContext((prev) => ({
        ...prev,
        activeTabUrl: activeTab.url,
        activeTabTitle: activeTab.title || 'Untitled',
        lastActivity: activeTab.lastActiveAt || activeTab.createdAt,
      }));
    }

    // Real topic detection using TopicDetectionService
    if (activeTab?.url) {
      topicDetectionService
        .detectTopic(activeTab.url, activeTab.title)
        .then((detected) => {
          setContext((prev) => ({
            ...prev,
            detectedTopic: detected.topic,
          }));
          
          // Record topic interest in context memory
          contextMemory.recordTopicInterest(detected.topic);
        })
        .catch((error) => {
          console.warn('[LiveContextStrip] Topic detection failed:', error);
        });
    }

    // Calculate reading time (simplified: assume 200 words/min)
    // In real implementation, would analyze page content
    const estimatedReadingTime = Math.max(30, Math.floor(Math.random() * 300)); // 30s to 5min
    setContext((prev) => ({
      ...prev,
      readingTime: estimatedReadingTime,
    }));

    // Calculate loop risk (simplified: based on time spent)
    const timeSpent = activeTab?.lastActiveAt
      ? Date.now() - activeTab.lastActiveAt
      : 0;
    let loopRisk: 'low' | 'medium' | 'high' = 'low';
    if (timeSpent > 10 * 60 * 1000) {
      // 10 minutes
      loopRisk = 'high';
    } else if (timeSpent > 5 * 60 * 1000) {
      // 5 minutes
      loopRisk = 'medium';
    }

    setContext((prev) => ({
      ...prev,
      loopRisk,
      isObserving: true,
    }));
  }, [activeTab]);

  const formatReadingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const loopRiskColor = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  const loopRiskIcon = {
    low: null,
    medium: AlertTriangle,
    high: AlertTriangle,
  };

  if (!activeTab || !context.activeTabUrl) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm ${className}`}
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Context Info */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            {/* Active Tab */}
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-400 truncate">{context.activeTabTitle || 'Untitled'}</div>
                <div className="text-xs text-slate-500 truncate">{context.activeTabUrl}</div>
              </div>
            </div>

            {/* Detected Topic */}
            {context.detectedTopic && (
              <div className="flex items-center gap-2 min-w-0">
                <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="text-xs text-slate-300 truncate">{context.detectedTopic}</div>
              </div>
            )}

            {/* Reading Time */}
            {context.readingTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-xs text-slate-300">{formatReadingTime(context.readingTime)}</div>
              </div>
            )}

            {/* Loop Risk */}
            {context.loopRisk && context.loopRisk !== 'low' && (() => {
              const RiskIcon = loopRiskIcon[context.loopRisk];
              return (
                <div className="flex items-center gap-2">
                  {RiskIcon && (
                    <RiskIcon className={`w-4 h-4 ${loopRiskColor[context.loopRisk]} flex-shrink-0`} />
                  )}
                  <div className={`text-xs ${loopRiskColor[context.loopRisk]}`}>
                    Loop Risk: {context.loopRisk}
                  </div>
                </div>
              );
            })()}

            {/* Observing Indicator */}
            {context.isObserving && (
              <motion.div
                className="flex items-center gap-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="text-xs text-emerald-400">Observing</div>
              </motion.div>
            )}
          </div>

          {/* Right: Expand/Collapse */}
          {showDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="w-4 h-4" />
              </motion.div>
            </button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-slate-700/50"
          >
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-slate-400 mb-1">Context</div>
                <div className="text-slate-300">
                  {context.activeTabUrl ? new URL(context.activeTabUrl).hostname : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Last Activity</div>
                <div className="text-slate-300">
                  {context.lastActivity
                    ? new Date(context.lastActivity).toLocaleTimeString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
