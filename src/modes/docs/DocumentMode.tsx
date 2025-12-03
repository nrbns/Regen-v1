/**
 * Document Mode - Tier 3 Pillar 2
 * PDF/document upload and AI digestion
 */

import { useState } from 'react';
import { FileText, Upload, Sparkles, FileCheck } from 'lucide-react';
import { EmptyStates } from '../../components/empty-states/EmptyState';

type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  processed?: boolean;
};

export function DocumentMode() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [_uploading, setUploading] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // TODO: Implement actual upload and processing
      const newDocs: Document[] = Array.from(files).map(file => ({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        processed: false,
      }));

      setDocuments(prev => [...prev, ...newDocs]);
    } catch (error) {
      console.error('Failed to upload documents', error);
    } finally {
      setUploading(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="h-full w-full">
        <EmptyStates.NoDocuments onUpload={handleFileUpload} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-950">
      {/* Document List */}
      <div className="w-80 border-r border-slate-800 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Documents</h2>
          <label className="cursor-pointer rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700">
            <Upload size={16} className="mr-1 inline" />
            Upload
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={e => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{doc.name}</p>
                  <p className="text-xs text-slate-400">{(doc.size / 1024).toFixed(1)} KB</p>
                </div>
                {doc.processed && <FileCheck size={14} className="text-green-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document View */}
      <div className="flex-1 p-4">
        <div className="h-full rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles size={20} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
          </div>
          <p className="text-slate-400">
            Select a document to see AI-powered analysis, summaries, and extracted information.
          </p>
        </div>
      </div>
    </div>
  );
}

// Add to EmptyStates
export const NoDocuments = ({ onUpload }: { onUpload: (files: FileList | null) => void }) => (
  <div className="flex h-full flex-col items-center justify-center">
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-4">
      <FileText size={48} className="text-purple-300" />
    </div>
    <h3 className="mb-2 text-xl font-semibold text-white">No documents yet</h3>
    <p className="mb-6 max-w-md text-center text-slate-400">
      Upload PDFs, documents, or text files to get AI-powered summaries and analysis.
    </p>
    <label className="cursor-pointer rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 font-medium text-white shadow-lg shadow-purple-500/30 transition-all hover:from-purple-600 hover:to-cyan-600">
      <Upload size={18} className="mr-2 inline" />
      Upload Documents
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        onChange={e => onUpload(e.target.files)}
        className="hidden"
      />
    </label>
  </div>
);
