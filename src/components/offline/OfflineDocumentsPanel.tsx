/**
 * Offline Documents Panel
 * UI component for managing stored offline documents
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Trash2,
  ExternalLink,
  Clock,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { useOfflineRAG } from '../../hooks/useOfflineRAG';
import { type StoredDocument } from '../../lib/offline-store/indexedDB';
import { toast } from '../../utils/toast';
import { formatDistanceToNow } from 'date-fns';

interface OfflineDocumentsPanelProps {
  onDocumentSelect?: (document: StoredDocument) => void;
  onClose?: () => void;
}

export function OfflineDocumentsPanel({ onDocumentSelect, onClose }: OfflineDocumentsPanelProps) {
  const { listDocuments, deleteDocument, stats, refreshStats, search } = useOfflineRAG();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoredDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load documents
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await listDocuments({ limit: 50 });
      setDocuments(docs);
    } catch (error) {
      console.error('[OfflineDocumentsPanel] Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    refreshStats();
  }, [refreshStats]);

  // Search documents
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await search(query, { limit: 20 });
      if (results) {
        setSearchResults(results.documents.map(r => r.document));
      }
    } catch (error) {
      console.error('[OfflineDocumentsPanel] Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delete document
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDocument(id);
      await loadDocuments();
      await refreshStats();
      toast.success('Document deleted');
    } catch (error) {
      console.error('[OfflineDocumentsPanel] Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  // Open document URL
  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const displayDocuments = searchQuery ? searchResults : documents;

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-purple-400" />
          <div>
            <h2 className="text-lg font-semibold">Offline Documents</h2>
            <p className="text-sm text-slate-400">
              {stats.documentCount} documents • {stats.storageSizeMB} MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDocuments}
            className="rounded-lg p-2 transition-colors hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-slate-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search offline documents..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-400">Loading documents...</span>
          </div>
        ) : displayDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-600" />
            <p className="mb-2 text-slate-400">
              {searchQuery ? 'No documents found' : 'No offline documents yet'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-slate-500">
                Save web pages or documents to access them offline
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayDocuments.map(doc => (
              <div
                key={doc.id}
                className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-purple-500/50"
                onClick={() => onDocumentSelect?.(doc)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-purple-400" />
                      <h3 className="truncate font-medium text-white">{doc.title}</h3>
                    </div>

                    {doc.excerpt && (
                      <p className="mb-2 line-clamp-2 text-sm text-slate-400">{doc.excerpt}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(doc.indexedAt), { addSuffix: true })}
                      </span>
                      {doc.metadata?.wordCount && (
                        <span>{doc.metadata.wordCount.toLocaleString()} words</span>
                      )}
                      {doc.accessCount > 0 && <span>Accessed {doc.accessCount} times</span>}
                    </div>

                    {doc.url && (
                      <a
                        href={doc.url}
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenUrl(doc.url);
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {doc.url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenUrl(doc.url);
                      }}
                      className="rounded p-2 transition-colors hover:bg-slate-700"
                      title="Open URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="rounded p-2 text-red-400 transition-colors hover:bg-red-900/50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-400">Searching...</span>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {displayDocuments.length} {displayDocuments.length === 1 ? 'document' : 'documents'}
            {searchQuery && ' found'}
          </span>
          <span className="text-slate-500">Storage: {stats.storageSizeMB} MB</span>
        </div>
      </div>
    </div>
  );
}
