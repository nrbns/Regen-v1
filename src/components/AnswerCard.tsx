/**
 * AnswerCard - Zero-Click Answer Display
 * 
 * Shows structured AI answers FIRST, with sources as secondary information.
 * This is the core UI component for the "AI-Native Content OS" vision.
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Calendar,
  FileText,
  Brain
} from 'lucide-react';
import { QueryResult } from '../core/query-engine';
import { EcoBadge } from './EcoBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerCardProps {
  result: QueryResult;
  onViewSource?: (url: string) => void;
  onViewFullPage?: (url: string) => void;
  className?: string;
}

export function AnswerCard({ result, onViewSource, onViewFullPage, className = '' }: AnswerCardProps) {
  const [expandedCitations, setExpandedCitations] = useState(false);
  const [expandedSources, setExpandedSources] = useState(false);
  const [expandedContradictions, setExpandedContradictions] = useState(false);

  const getIntentIcon = () => {
    switch (result.intent) {
      case 'comparison':
        return <BarChart3 className="w-4 h-4" />;
      case 'timeline':
        return <Calendar className="w-4 h-4" />;
      case 'fact':
      case 'definition':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'code':
        return <FileText className="w-4 h-4" />;
      case 'calculation':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getIntentLabel = () => {
    switch (result.intent) {
      case 'comparison':
        return 'Comparison';
      case 'timeline':
        return 'Timeline';
      case 'fact':
        return 'Fact';
      case 'definition':
        return 'Definition';
      case 'code':
        return 'Code';
      case 'calculation':
        return 'Calculation';
      default:
        return 'Research';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/80 border border-gray-800 rounded-xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            {getIntentIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-100">AI Answer</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                {getIntentLabel()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {result.latency}ms • {result.sources.length} sources
            </div>
          </div>
        </div>
        
        {/* Eco Badge */}
        {result.ecoScore && (
          <EcoBadge
            score={result.ecoScore.score}
            tier={result.ecoScore.tier}
            co2SavedG={result.ecoScore.co2Saved}
            className="scale-90"
          />
        )}
      </div>

      {/* Answer Content */}
      <div className="prose prose-invert prose-sm max-w-none mb-4">
        <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
          {result.answer}
        </div>
      </div>

      {/* Contradictions Warning */}
      {result.contradictions && result.contradictions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <button
            onClick={() => setExpandedContradictions(!expandedContradictions)}
            className="flex items-center gap-2 w-full text-left"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">
              {result.contradictions.length} contradiction{result.contradictions.length > 1 ? 's' : ''} found
            </span>
            {expandedContradictions ? (
              <ChevronUp className="w-4 h-4 text-yellow-400 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 text-yellow-400 ml-auto" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedContradictions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {result.contradictions.map((contradiction, idx) => (
                  <div key={idx} className="text-xs text-yellow-300/80 pl-6">
                    <div className="font-medium">{contradiction.fact}</div>
                    <div className="text-yellow-400/60 mt-1">
                      Conflicting sources: {contradiction.conflictingSources.length}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Citations */}
      {result.citations.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setExpandedCitations(!expandedCitations)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {result.citations.length} source{result.citations.length > 1 ? 's' : ''} cited
            </span>
            {expandedCitations ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedCitations && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {result.citations.map((citation) => (
                  <div
                    key={citation.index}
                    className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
                  >
                    <span className="text-xs text-blue-400 font-medium min-w-[24px]">
                      [{citation.index}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300 truncate">
                        {citation.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {citation.url}
                      </div>
                    </div>
                    <button
                      onClick={() => onViewSource?.(citation.url)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="View source"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sources (Secondary - Collapsed by default) */}
      {result.sources.length > 0 && (
        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={() => setExpandedSources(!expandedSources)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors w-full"
          >
            <ExternalLink className="w-4 h-4" />
            <span>
              {result.sources.length} source{result.sources.length > 1 ? 's' : ''} available
            </span>
            <span className="text-xs text-gray-500 ml-auto">(Click to view full pages)</span>
            {expandedSources ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSources && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {result.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => onViewFullPage?.(source.url)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 truncate">
                        {source.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {source.snippet}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {source.url}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewFullPage?.(source.url);
                      }}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Knowledge Graph Preview (if available) */}
      {result.knowledgeGraph && result.knowledgeGraph.nodes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 mb-2">
            Knowledge connections: {result.knowledgeGraph.nodes.length} nodes, {result.knowledgeGraph.edges.length} relationships
          </div>
          <div className="flex flex-wrap gap-2">
            {result.knowledgeGraph.nodes.slice(0, 5).map((node) => (
              <span
                key={node.key}
                className="text-xs px-2 py-1 bg-gray-800/50 rounded text-gray-300"
              >
                {node.title || node.key}
              </span>
            ))}
            {result.knowledgeGraph.nodes.length > 5 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{result.knowledgeGraph.nodes.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

