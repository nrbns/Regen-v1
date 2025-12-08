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

export function OfflineDocumentsPanel({
  onDocumentSelect,
  onClose,
}: OfflineDocumentsPanelProps) {
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
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
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
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offline documents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
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
            <FileText className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">
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
            {displayDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer"
                onClick={() => onDocumentSelect?.(doc)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <h3 className="font-medium text-white truncate">{doc.title}</h3>
                    </div>
                    
                    {doc.excerpt && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                        {doc.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(doc.indexedAt), { addSuffix: true })}
                      </span>
                      {doc.metadata?.wordCount && (
                        <span>{doc.metadata.wordCount.toLocaleString()} words</span>
                      )}
                      {doc.accessCount > 0 && (
                        <span>Accessed {doc.accessCount} times</span>
                      )}
                    </div>

                    {doc.url && (
                      <a
                        href={doc.url}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUrl(doc.url);
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {doc.url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenUrl(doc.url);
                      }}
                      className="p-2 rounded hover:bg-slate-700 transition-colors"
                      title="Open URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="p-2 rounded hover:bg-red-900/50 transition-colors text-red-400"
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
            <RefreshCw className="h-4 w-4 animate-spin text-slate-400 mr-2" />
            <span className="text-sm text-slate-400">Searching...</span>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {displayDocuments.length} {displayDocuments.length === 1 ? 'document' : 'documents'}
            {searchQuery && ' found'}
          </span>
          <span className="text-slate-500">
            Storage: {stats.storageSizeMB} MB
          </span>
        </div>
      </div>
    </div>
  );
}


