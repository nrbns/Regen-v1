/**
 * Automatic Suggestions Component
 * Shows contextual action suggestions based on page content
 * "Regen suggests: Summarize this article"
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Link2, BarChart3, X, Zap } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { topicDetectionService } from '../../lib/services/TopicDetectionService';
import { useNavigate } from 'react-router-dom';

export interface Suggestion {
  id: string;
  action: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  taskId: string;
  confidence: number;
}

export interface AutomaticSuggestionsProps {
  className?: string;
  maxSuggestions?: number;
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

export function AutomaticSuggestions({
  className = '',
  maxSuggestions = 3,
  onSuggestionClick,
}: AutomaticSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  
  const activeTab = useTabsStore((state) => {
    const tabs = state.tabs;
    return tabs.find((t) => t.id === state.activeTabId);
  });

  useEffect(() => {
    if (!activeTab?.url) {
      setIsVisible(false);
      return;
    }

    // Detect topic and generate suggestions
    const generateSuggestions = async () => {
      try {
        const detectedTopic = await topicDetectionService.detectTopic(
          activeTab.url || '',
          activeTab.title,
          undefined // Content would come from page scraping
        );

        // Generate suggestions based on topic and page type
        const newSuggestions: Suggestion[] = [];

        // Always suggest summarize for articles/research
        if (detectedTopic.category === 'academic' || detectedTopic.category === 'media') {
          newSuggestions.push({
            id: 'suggest-summarize',
            action: 'Summarize this page',
            description: `Get a quick summary of this ${detectedTopic.topic.toLowerCase()} content`,
            icon: FileText,
            taskId: 'summarize_page',
            confidence: 0.9,
          });
        }

        // Suggest link extraction for reference pages
        if (detectedTopic.category === 'academic' || detectedTopic.category === 'technology') {
          newSuggestions.push({
            id: 'suggest-extract-links',
            action: 'Extract links',
            description: 'Find all references and related links',
            icon: Link2,
            taskId: 'extract_links',
            confidence: 0.8,
          });
        }

        // Suggest analysis for technical content
        if (detectedTopic.category === 'technology' || detectedTopic.topic.includes('AI') || detectedTopic.topic.includes('Programming')) {
          newSuggestions.push({
            id: 'suggest-analyze',
            action: 'Analyze content',
            description: `Get insights about ${detectedTopic.topic.toLowerCase()}`,
            icon: BarChart3,
            taskId: 'analyze_content',
            confidence: 0.85,
          });
        }

        // Sort by confidence and limit
        const sortedSuggestions = newSuggestions
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxSuggestions);

        if (sortedSuggestions.length > 0) {
          setSuggestions(sortedSuggestions);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } catch (error) {
        console.warn('[AutomaticSuggestions] Failed to generate suggestions:', error);
        setIsVisible(false);
      }
    };

    // Delay to avoid showing suggestions too quickly
    const timer = setTimeout(generateSuggestions, 2000);
    return () => clearTimeout(timer);
  }, [activeTab?.url, activeTab?.title, maxSuggestions]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      // Default: Navigate to task runner with pre-filled task
      navigate('/task-runner', { state: { suggestedTask: suggestion.taskId } });
    }
    setIsVisible(false);
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 shadow-lg ${className}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
            </motion.div>
            <h3 className="text-sm font-semibold text-slate-200">Regen suggests:</h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Dismiss suggestions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-start gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 hover:border-purple-500 transition-all text-left group"
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <Icon className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                    {suggestion.action}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {suggestion.description}
                  </div>
                </div>
                <Zap className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
