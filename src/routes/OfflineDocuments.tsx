/**
 * Offline Documents Route
 * Full page view for managing offline documents
 */

import { useState } from 'react';
import { FileText, Plus, X } from 'lucide-react';
import { OfflineDocumentsPanel } from '../components/offline/OfflineDocumentsPanel';
import { SavePageButton } from '../components/offline/SavePageButton';
import { type StoredDocument } from '../lib/offline-store/indexedDB';

export default function OfflineDocuments() {
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveUrl, setSaveUrl] = useState('');

  const _handleSaveUrl = () => {
    if (!saveUrl.trim()) return;
    setShowSaveDialog(false);
    // The SavePageButton will handle the actual save
  };

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold">Offline Documents</h1>
            <p className="text-sm text-slate-400">Save and search web pages for offline access</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            <span>Save Page</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {selectedDoc ? (
          <div className="flex h-full flex-col">
            {/* Document View */}
            <div className="flex items-center justify-between border-b border-slate-700 p-4">
              <h2 className="text-lg font-semibold">{selectedDoc.title}</h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-lg p-2 transition-colors hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDoc.html ? (
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedDoc.html }}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Content</h3>
                    <p className="whitespace-pre-wrap text-slate-300">{selectedDoc.content}</p>
                  </div>
                  {selectedDoc.url && (
                    <div>
                      <h3 className="mb-2 text-lg font-semibold">URL</h3>
                      <a
                        href={selectedDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-purple-400 hover:text-purple-300"
                      >
                        {selectedDoc.url}
                      </a>
                    </div>
                  )}
                  {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 && (
                    <div>
                      <h3 className="mb-2 text-lg font-semibold">Metadata</h3>
                      <pre className="overflow-x-auto rounded-lg bg-slate-800 p-4 text-sm">
                        {JSON.stringify(selectedDoc.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <OfflineDocumentsPanel onDocumentSelect={setSelectedDoc} />
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Save Page for Offline</h2>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveUrl('');
                }}
                className="rounded p-1 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">URL</label>
                <input
                  type="url"
                  value={saveUrl}
                  onChange={e => setSaveUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveUrl('');
                  }}
                  className="rounded-lg bg-slate-700 px-4 py-2 transition-colors hover:bg-slate-600"
                >
                  Cancel
                </button>
                <SavePageButton
                  url={saveUrl}
                  title=""
                  variant="default"
                  className="flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
