import React, { useState } from 'react';
import { FileText, Search, Trash2, Download } from 'lucide-react';

export interface StoredDocument {
  id: string;
  title: string;
  url?: string;
  content?: string;
  html?: string;
  metadata?: Record<string, any>;
  savedAt: Date;
  size?: number;
}

interface OfflineDocumentsPanelProps {
  onDocumentSelect: (doc: StoredDocument) => void;
}

export function OfflineDocumentsPanel({ onDocumentSelect }: OfflineDocumentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents] = useState<StoredDocument[]>([
    // Mock data for demo
    {
      id: '1',
      title: 'Sample Document 1',
      url: 'https://example.com/article1',
      content: 'This is sample content for the first document...',
      savedAt: new Date('2024-01-15'),
      size: 1024,
    },
    {
      id: '2',
      title: 'Sample Document 2',
      url: 'https://example.com/article2',
      content: 'This is sample content for the second document...',
      savedAt: new Date('2024-01-14'),
      size: 2048,
    },
  ]);

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search Bar */}
      <div className="border-b border-slate-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDocuments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No documents found</h3>
            <p className="text-slate-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Save some pages for offline access to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:bg-slate-750 hover:border-slate-600"
                onClick={() => onDocumentSelect(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-200 truncate">{doc.title}</h3>
                    {doc.url && (
                      <p className="mt-1 text-sm text-slate-400 truncate">{doc.url}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>{doc.savedAt.toLocaleDateString()}</span>
                      {doc.size && <span>{Math.round(doc.size / 1024)}KB</span>}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle download
                      }}
                      className="rounded p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle delete
                      }}
                      className="rounded p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {doc.content && (
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {doc.content.substring(0, 150)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}