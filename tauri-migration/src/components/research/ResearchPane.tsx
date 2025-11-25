/**
 * Research Pane - Right-side panel for Research Mode
 * Provides query interface, streaming answers, and source cards
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  Camera,
  Loader2,
  ExternalLink,
  // ChevronRight,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { searchChunks, syncDocumentsFromBackend } from '../../lib/research/cache';
import { DocumentViewer } from './DocumentViewer';
import { ipcEvents } from '../../lib/ipc-events';

interface SourceCard {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  type: 'tab' | 'pdf' | 'snapshot' | 'repo' | 'web';
  confidence?: number;
  publishedAt?: string;
}

interface AnswerChunk {
  content: string;
  citations: string[];
}

export function ResearchPane() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answerChunks, setAnswerChunks] = useState<AnswerChunk[]>([]);
  const [sources, setSources] = useState<SourceCard[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<{
    id: string;
    title: string;
    url?: string;
    type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'snapshot' | 'web';
    snippet?: string;
    content?: string;
  } | null>(null);
  const [viewerHighlight, setViewerHighlight] = useState<string | undefined>();
  const { activeId, tabs } = useTabsStore();
  const activeTab = tabs.find(tab => tab.id === activeId);
  const streamChannelRef = useRef<string | null>(null);

  // Check if Research Mode is active
  const mode = useAppStore(s => s.mode);
  const isResearchMode = mode === 'Research';

  useEffect(() => {
    // Auto-open when Research mode is active
    if (isResearchMode && !isOpen) {
      setIsOpen(true);
    }
  }, [isResearchMode, isOpen]);

  // Sync documents from backend on mount
  useEffect(() => {
    if (isOpen) {
      syncDocumentsFromBackend().catch(error => {
        console.error('Failed to sync documents on mount:', error);
      });
    }
  }, [isOpen]);

  // Listen for keyboard shortcuts to open pane
  useEffect(() => {
    const handleKeyboardOpen = () => {
      setIsOpen(true);
    };

    ipcEvents.on('research:keyboard-open-pane', handleKeyboardOpen);
    return () => {
      ipcEvents.off('research:keyboard-open-pane', handleKeyboardOpen);
    };
  }, []);

  // Cleanup WebSocket connection
  useEffect(() => {
    return () => {
      if (streamChannelRef.current) {
        // WebSocket cleanup handled in handleQuery
        streamChannelRef.current = null;
      }
    };
  }, []);

  const handleQuery = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setAnswerChunks([]);
    setSources([]);
    setActiveSourceId(null);

    try {
      // First, try local cache search for instant results
      const localResults = await searchChunks(query.trim(), 5);
      if (localResults.length > 0) {
        // Show local results immediately
        const localSources: SourceCard[] = localResults.map(chunk => ({
          id: chunk.id,
          title: chunk.metadata.title || 'Cached Document',
          url: chunk.metadata.url || '',
          snippet: chunk.content.slice(0, 200) + '...',
          type: (chunk.metadata.sourceType || 'web') as any,
          confidence: 0.8, // High confidence for local matches
        }));
        setSources(localSources);
      }

      // Start research stream via WebSocket (replaces Electron IPC)
      const { channel } = await ipc.researchStream.start(query.trim(), 'default');
      streamChannelRef.current = channel;

      // Use WebSocket for streaming (replaces window.ipc.on)
      const ws = new WebSocket(`ws://127.0.0.1:4000/ws/research/${channel}`);

      ws.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          switch (payload?.type) {
            case 'chunk':
              setAnswerChunks(prev => [
                ...prev,
                { content: payload.content, citations: payload.citations || [] },
              ]);
              break;
            case 'sources':
              if (payload.entries) {
                const sourceList: SourceCard[] = Object.entries(payload.entries).flatMap(
                  ([citeId, cites]: [string, any]) =>
                    (Array.isArray(cites) ? cites : []).map((cite: any) => ({
                      id: cite.id || citeId,
                      title: cite.title || 'Untitled',
                      url: cite.url || cite.fragmentUrl || '',
                      snippet: cite.snippet,
                      type: 'web' as const,
                      confidence: cite.relevanceScore,
                      publishedAt: cite.publishedAt,
                    }))
                );
                setSources(prev => {
                  const existingIds = new Set(prev.map(s => s.id));
                  const newSources = sourceList.filter(s => !existingIds.has(s.id));
                  return [...prev, ...newSources];
                });
              }
              break;
            case 'complete':
              setIsLoading(false);
              ws.close();
              break;
            case 'error':
              setIsLoading(false);
              console.error('Research error:', payload.message);
              ws.close();
              break;
          }
        } catch (error) {
          console.error('[ResearchPane] Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        setIsLoading(false);
        console.error('[ResearchPane] WebSocket error');
      };
    } catch (error) {
      setIsLoading(false);
      console.error('Failed to start research:', error);
    }
  }, [query, isLoading]);

  const handleSaveTabSnapshot = useCallback(async () => {
    if (!activeTab?.id) return;

    try {
      const { snapshotId } = await ipc.research.saveSnapshot(activeTab.id);
      console.log('Tab snapshot saved:', snapshotId);

      // Sync to cache after a short delay (allowing backend processing)
      setTimeout(async () => {
        try {
          await syncDocumentsFromBackend();
        } catch (error) {
          console.error('Failed to sync to cache:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }, [activeTab]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileId = await ipc.research.uploadFile(file);
      console.log('File uploaded:', fileId);

      // Sync to cache after a short delay (allowing backend processing)
      setTimeout(async () => {
        try {
          await syncDocumentsFromBackend();
        } catch (error) {
          console.error('Failed to sync to cache:', error);
        }
      }, 2000);

      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Failed to upload file:', error);
      event.target.value = '';
    }
  }, []);

  const handleOpenSource = useCallback(
    async (url: string) => {
      try {
        if (activeId) {
          await ipc.tabs.navigate(activeId, url);
        } else {
          await ipc.tabs.create(url);
        }
      } catch (error) {
        console.error('Failed to open source:', error);
      }
    },
    [activeId]
  );

  const handleViewDocument = useCallback(async (source: SourceCard, highlight?: string) => {
    // Try to get full content from cache or backend
    try {
      // For now, use the snippet as content
      // In a full implementation, we'd fetch the full document
      setViewerDocument({
        id: source.id,
        title: source.title,
        url: source.url,
        type: source.type === 'repo' ? 'web' : source.type,
        snippet: source.snippet,
      });
      setViewerHighlight(highlight);
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700 transition-colors"
        title="Open Research Pane"
      >
        <BookOpen size={20} />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 h-full w-96 bg-slate-950 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-100">Research Mode</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveTabSnapshot}
            disabled={!activeTab}
            className="p-1.5 rounded hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save current tab snapshot"
          >
            <Camera size={16} />
          </button>
          <label className="p-1.5 rounded hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
            <Upload size={16} />
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleQuery();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a research question..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Search
              </>
            )}
          </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Streaming Answer */}
        {answerChunks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Answer</h3>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              {answerChunks.map((chunk, idx) => (
                <div key={idx} className="text-sm text-gray-200 leading-relaxed">
                  {chunk.content.split(/(\[(\d+)\])/g).map((part, i) => {
                    const citationMatch = part.match(/^\[(\d+)\]$/);
                    if (citationMatch) {
                      const citeNum = citationMatch[1];
                      const citedSource = sources.find((s, idx) => idx + 1 === parseInt(citeNum));
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (citedSource) {
                              handleViewDocument(citedSource);
                            }
                          }}
                          className="ml-1 inline-flex items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-200 hover:bg-blue-500/25 hover:border-blue-400/60 transition-colors cursor-pointer"
                          title={
                            citedSource
                              ? `View source: ${citedSource.title}`
                              : `Citation ${citeNum}`
                          }
                        >
                          [{citeNum}]
                        </button>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  Streaming answer...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Sources ({sources.length})
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {sources.map(source => (
                  <motion.div
                    key={source.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-lg border p-3 space-y-2 transition-colors cursor-pointer ${
                      activeSourceId === source.id
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                    onClick={() =>
                      setActiveSourceId(activeSourceId === source.id ? null : source.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-400 uppercase">
                            {source.type}
                          </span>
                          {source.confidence && (
                            <span className="text-[10px] text-gray-500">
                              {Math.round(source.confidence * 100)}% match
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-gray-200 truncate">
                          {source.title}
                        </h4>
                        {source.snippet && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {source.snippet}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 truncate mt-1">{source.url}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleViewDocument(source, source.snippet);
                          }}
                          className="p-1.5 rounded hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors"
                          title="View document"
                        >
                          <FileText size={14} />
                        </button>
                        {source.url && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenSource(source.url);
                            }}
                            className="p-1.5 rounded hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors"
                            title="Open in tab"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && answerChunks.length === 0 && sources.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-3">
            <BookOpen size={48} className="opacity-50" />
            <div>
              <p className="text-sm font-medium text-gray-400">Start researching</p>
              <p className="text-xs text-gray-500 mt-1">
                Ask a question or save a tab snapshot to begin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Document Viewer */}
      {viewerDocument && (
        <DocumentViewer
          isOpen={!!viewerDocument}
          onClose={() => {
            setViewerDocument(null);
            setViewerHighlight(undefined);
          }}
          document={viewerDocument}
          highlightText={viewerHighlight}
        />
      )}
    </motion.div>
  );
}
