/**
 * Document Auto-Edit Component
 * Main UI for uploading, editing, and previewing documents
 */

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Download, Eye, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '../../utils/toast';
import { ConsentModal } from './ConsentModal';
import type { EditTask, EditResult } from '../../types/doc-editor';

export function DocumentEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [task, setTask] = useState<EditTask>('rewrite');

  // Listen for command palette commands
  useEffect(() => {
    const handleDocCommand = (e: CustomEvent) => {
      if (e.detail?.task) {
        setTask(e.detail.task as EditTask);
        toast.info(`Task set to: ${e.detail.task}`);
      }
    };

    window.addEventListener('doc-command', handleDocCommand as EventListener);
    return () => {
      window.removeEventListener('doc-command', handleDocCommand as EventListener);
    };
  }, []);
  const [style, setStyle] = useState<string>('preserve');
  const [language, setLanguage] = useState<string>('en');
  const [cloudLLM, setCloudLLM] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<EditResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/plain',
        'text/markdown',
      ];

      if (
        !validTypes.includes(selectedFile.type) &&
        !selectedFile.name.match(/\.(docx|pdf|xlsx|txt|md)$/i)
      ) {
        toast.error('Unsupported file type. Please upload DOCX, PDF, XLSX, TXT, or MD files.');
        return;
      }

      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setFile(selectedFile);
      setResult(null);
    }
  }, []);

  const handleEdit = useCallback(async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    // Show consent modal if cloud LLM is selected
    if (cloudLLM) {
      setShowConsentModal(true);
      return;
    }

    await processDocument();
  }, [file, task, style, language, cloudLLM]);

  const processDocument = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setResult(null);
    setShowConsentModal(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task', task);
      formData.append('style', style);
      formData.append('language', language);
      formData.append('cloudLLM', cloudLLM.toString());
      formData.append('preserveFormatting', 'true');

      const response = await fetch('/api/doc/edit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Document processing failed');
      }

      const editResult = await response.json();
      setResult(editResult);
      toast.success('Document processed successfully!');
    } catch (error) {
      console.error('[DocumentEditor] Edit failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  }, [file, task, style, language, cloudLLM]);

  const handleConsentAccept = useCallback(() => {
    setShowConsentModal(false);
    processDocument();
  }, [processDocument]);

  const handleConsentReject = useCallback(() => {
    setShowConsentModal(false);
    setCloudLLM(false);
    toast.info('Switched to local processing. Processing may be slower.');
  }, []);

  const handleDownload = useCallback(async () => {
    if (!result) return;

    try {
      const response = await fetch(result.downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${result.originalName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('File downloaded!');
    } catch {
      toast.error('Failed to download file');
    }
  }, [result]);

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-red-400',
  };

  const confidenceIcons = {
    high: CheckCircle2,
    medium: AlertCircle,
    low: AlertCircle,
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <h1 className="text-xl font-semibold">Document Auto-Edit</h1>
        <p className="mt-1 text-sm text-slate-400">
          AI-powered document editing: rewrite, grammar, summarize, translate, and more
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* File Upload */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <label className="mb-2 block text-sm font-medium">Upload Document</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".docx,.pdf,.xlsx,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="rounded-lg border-2 border-dashed border-slate-700 p-8 text-center transition-colors hover:border-slate-600">
                  {file ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-400" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 h-12 w-12 text-slate-500" />
                      <p className="text-slate-400">Click to upload or drag and drop</p>
                      <p className="mt-1 text-xs text-slate-500">
                        DOCX, PDF, XLSX, TXT, MD (max 100MB)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Edit Options */}
          {file && (
            <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold">Edit Options</h2>

              {/* Task Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium">Edit Task</label>
                <select
                  value={task}
                  onChange={e => setTask(e.target.value as EditTask)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                >
                  <option value="rewrite">Rewrite</option>
                  <option value="grammar">Fix Grammar</option>
                  <option value="summarize">Summarize</option>
                  <option value="expand">Expand</option>
                  <option value="translate">Translate</option>
                  <option value="formal">Make Formal</option>
                  <option value="casual">Make Casual</option>
                  <option value="concise">Make Concise</option>
                  <option value="bulletize">Convert to Bullets</option>
                  <option value="normalize">Normalize (Excel)</option>
                </select>
              </div>

              {/* Style (for rewrite) */}
              {task === 'rewrite' && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Style</label>
                  <select
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="preserve">Preserve Original</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="concise">Concise</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              )}

              {/* Language (for translate) */}
              {task === 'translate' && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Target Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              )}

              {/* Cloud LLM Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cloudLLM"
                  checked={cloudLLM}
                  onChange={e => setCloudLLM(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800"
                />
                <label htmlFor="cloudLLM" className="text-sm">
                  Use Cloud LLM (requires consent - faster, but data sent to external API)
                </label>
              </div>

              {/* Process Button */}
              <button
                onClick={handleEdit}
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Process Document
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Results</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
                  >
                    <Eye className="h-4 w-4" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Confidence Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Confidence:</span>
                {(() => {
                  const Icon = confidenceIcons[result.confidence];
                  return (
                    <div
                      className={`flex items-center gap-1 ${confidenceColors[result.confidence]}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium capitalize">{result.confidence}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Metadata */}
              {result.metadata && (
                <div className="space-y-1 text-sm text-slate-400">
                  {result.metadata.model && <p>Model: {result.metadata.model}</p>}
                  {result.metadata.processingTime && (
                    <p>Processing Time: {(result.metadata.processingTime / 1000).toFixed(1)}s</p>
                  )}
                  {result.metadata.wordCount && <p>Word Count: {result.metadata.wordCount}</p>}
                </div>
              )}

              {/* Changes Summary */}
              <div>
                <p className="mb-2 text-sm text-slate-400">
                  Changes: {result.changes.length} modification(s)
                </p>
                {showPreview && result.changes.length > 0 && (
                  <div className="mt-4 max-h-96 space-y-2 overflow-auto">
                    {result.changes.slice(0, 10).map((change, idx) => (
                      <div key={idx} className="space-y-1 rounded-lg bg-slate-800 p-3 text-sm">
                        {change.original && (
                          <div>
                            <span className="text-red-400">- </span>
                            <span className="text-slate-300 line-through">{change.original}</span>
                          </div>
                        )}
                        {change.edited && (
                          <div>
                            <span className="text-green-400">+ </span>
                            <span className="text-slate-200">{change.edited}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {result.changes.length > 10 && (
                      <p className="text-center text-xs text-slate-500">
                        ... and {result.changes.length - 10} more changes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onReject={handleConsentReject}
        fileName={file?.name || 'document'}
      />
    </div>
  );
}
