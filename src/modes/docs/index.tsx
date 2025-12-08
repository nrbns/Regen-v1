// @ts-nocheck

import { useEffect, useMemo, useState } from 'react';
import {
  FilePlus,
  Globe,
  Loader2,
  Shield,
  UploadCloud,
  X,
  Highlighter,
  AlertTriangle,
  GitBranch,
  Clock3,
  BookOpenCheck,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import {
  DocumentReview,
  FactHighlight,
  AssumptionHighlight,
  AuditTrailEntry,
} from '../../types/document-review';
import { PDFViewer } from '../../components/DocumentViewer/PDFViewer';
import { CommentsPanel, Comment } from '../../components/DocumentViewer/CommentsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { DocumentEditor } from '../../components/docs/DocumentEditor';
import { OCRProcessor } from '../../components/docs/OCRProcessor';
// import { toast } from '../../utils/toast'; // Unused

type ViewMode = 'list' | 'review' | 'ingest';
type IngestType = 'pdf' | 'docx' | 'web';

export default function DocsPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [activeReview, setActiveReview] = useState<DocumentReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestType, setIngestType] = useState<IngestType>('pdf');
  const [ingestUrl, setIngestUrl] = useState('');
  const [fileToIngest, setFileToIngest] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [showOCR, setShowOCR] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const list = await ipc.document.list();
        setReviews(list as DocumentReview[]);
      } catch (err) {
        console.error('Failed to load document reviews', err);
      }
    };
    void loadReviews();
  }, []);

  const handleSelectReview = (review: DocumentReview) => {
    setActiveReview(review);
    setViewMode('review');
  };

  const handleStartIngest = (type: IngestType) => {
    setError(null);
    setUploadProgress(null);
    setFileToIngest(null);
    setIngestUrl('');
    setIngestType(type);
    setViewMode('ingest');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setFileToIngest(file);
    }
  };

  const handleIngestCancel = () => {
    setViewMode(activeReview ? 'review' : 'list');
    setFileToIngest(null);
    setError(null);
  };

  const handleIngest = async () => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(5);

      let payloadSource: string = '';
      let payloadType: IngestType = ingestType;

      if (ingestType === 'web') {
        if (!ingestUrl.trim()) {
          setError('Please enter a URL to ingest.');
          setLoading(false);
          return;
        }
        payloadSource = ingestUrl.trim();
      } else {
        if (!fileToIngest) {
          setError('Please choose a file to ingest.');
          setLoading(false);
          return;
        }
        const buffer = await fileToIngest.arrayBuffer();
        payloadSource = Buffer.from(buffer).toString('base64');
        payloadType = fileToIngest.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
      }

      setUploadProgress(30);
      const review = await ipc.document.ingest(
        payloadSource,
        payloadType,
        fileToIngest?.name || ingestUrl || undefined
      );
      setUploadProgress(90);

      const reviewData = review as DocumentReview;
      setReviews(prev => [reviewData, ...prev]);
      setActiveReview(reviewData);
      setViewMode('review');
    } catch (err: any) {
      console.error('Document ingest failed', err);
      setError(err?.message || 'Failed to ingest document.');
    } finally {
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 800);
      setLoading(false);
    }
  };

  const handleDeleteReview = async (review: DocumentReview) => {
    if (!confirm(`Delete "${review.title}"?`)) return;
    try {
      await ipc.document.delete({ id: review.id });
      setReviews(prev => prev.filter(r => r.id !== review.id));
      if (activeReview?.id === review.id) {
        setActiveReview(null);
        setViewMode('list');
      }
    } catch (err) {
      console.error('Failed to delete review', err);
    }
  };

  return (
    <div className="flex h-full bg-[#1A1D28] text-gray-100 overflow-hidden">
      <Sidebar
        reviews={reviews}
        activeReview={activeReview}
        onSelectReview={handleSelectReview}
        onCreate={handleStartIngest}
      />

      <main className="flex-1 overflow-y-auto">
        {showOCR && ocrFile ? (
          <OCRProcessor
            file={ocrFile}
            onComplete={(result) => {
              // Phase 2, Day 2: OCR completed
              console.log('[Docs] OCR completed:', result);
            }}
            onCancel={() => {
              setShowOCR(false);
              setOcrFile(null);
            }}
          />
        ) : showEditor && editorFile ? (
          <DocumentEditor
            file={editorFile}
            onSave={async (editedContent) => {
              // Phase 2, Day 1: Save edited content
              try {
                const blob = new Blob([editedContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = editorFile.name.replace(/\.(pdf|docx|xlsx)$/, '_edited.txt');
                a.click();
                URL.revokeObjectURL(url);
                setShowEditor(false);
                setEditorFile(null);
              } catch (error) {
                console.error('Failed to save edited document:', error);
              }
            }}
            onClose={() => {
              setShowEditor(false);
              setEditorFile(null);
            }}
          />
        ) : (
          <>
            {viewMode === 'list' && <EmptyState onCreate={handleStartIngest} />}

            {viewMode === 'ingest' && (
              <IngestForm
                ingestType={ingestType}
                ingestUrl={ingestUrl}
                loading={loading}
                uploadProgress={uploadProgress}
                error={error}
                fileToIngest={fileToIngest}
                onTypeChange={setIngestType}
                onUrlChange={setIngestUrl}
                onFileSelect={handleFileSelect}
                onSubmit={handleIngest}
                onCancel={handleIngestCancel}
                onEdit={(file) => {
                  // Phase 2, Day 1: Open editor for file
                  setEditorFile(file);
                  setShowEditor(true);
                }}
                onOCR={(file) => {
                  // Phase 2, Day 2: Open OCR processor for file
                  setOcrFile(file);
                  setShowOCR(true);
                }}
              />
            )}

        {viewMode === 'review' && activeReview && (
          <DocumentReviewView
            review={activeReview}
            onReverify={async () => {
              try {
                setLoading(true);
                const updated = await ipc.document.reverify({ id: activeReview.id });
                const newReview = updated as DocumentReview;
                setActiveReview(newReview);
                setReviews(prev => prev.map(r => (r.id === newReview.id ? newReview : r)));
              } catch (err) {
                console.error('Reverify failed', err);
              } finally {
                setLoading(false);
              }
            }}
            onExport={async (format, style) => {
              try {
                setLoading(true);
                const outputPath = window.prompt(
                  'Save to path',
                  `~/Documents/${activeReview.title}.${format === 'markdown' ? 'md' : 'html'}`
                );
                if (!outputPath) return;
                await ipc.document.export(activeReview.id, format, outputPath, style);
                alert('Export completed successfully');
              } catch (err) {
                console.error('Export failed', err);
                alert('Export failed. Check console for details.');
              } finally {
                setLoading(false);
              }
            }}
            onDelete={() => activeReview && handleDeleteReview(activeReview)}
          />
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface SidebarProps {
  reviews: DocumentReview[];
  activeReview: DocumentReview | null;
  onSelectReview(review: DocumentReview): void;
  onCreate(type: IngestType): void;
}

function Sidebar({ reviews, activeReview, onSelectReview, onCreate }: SidebarProps) {
  return (
    <aside className="w-80 border-r border-gray-800/40 bg-[#161924] flex flex-col">
      <div className="p-4 border-b border-gray-800/40">
        <h1 className="text-lg font-semibold">Document Review</h1>
        <p className="text-xs text-gray-500">Ingest, analyze, and verify documents</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => onCreate('pdf')}
            className="flex items-center justify-center gap-1 rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-indigo-200 hover:bg-indigo-500/20"
          >
            <FilePlus size={12} />
            PDF
          </button>
          <button
            onClick={() => onCreate('docx')}
            className="flex items-center justify-center gap-1 rounded border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-purple-200 hover:bg-purple-500/20"
          >
            <UploadCloud size={12} />
            DOCX
          </button>
          <button
            onClick={() => onCreate('web')}
            className="flex items-center justify-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20"
          >
            <Globe size={12} />
            Web
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reviews.length === 0 ? (
          <div className="p-4 text-xs text-gray-500">
            No documents yet. Ingest a PDF, DOCX, or web article to begin.
          </div>
        ) : (
          <ul>
            {reviews.map(review => (
              <li key={review.id}>
                <button
                  onClick={() => onSelectReview(review)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors ${activeReview?.id === review.id ? 'bg-gray-800/50' : ''}`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="uppercase tracking-wide text-[10px] text-gray-500">
                      {review.type}
                    </span>
                    <span>{formatDistanceToNow(review.updatedAt, { addSuffix: true })}</span>
                  </div>
                  <div className="mt-1 font-medium text-sm text-gray-100 line-clamp-2">
                    {review.title}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    {review.sections.length} sections • {review.claims.length} claims
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

interface EmptyStateProps {
  onCreate(type: IngestType): void;
}

function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-gray-400">
      <div className="rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-6">
        <Shield size={48} className="text-purple-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-100">Start your first review</h2>
        <p>Upload a PDF/DOCX or ingest a web article to analyze claims, entities, and timelines.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onCreate('pdf')}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 transition-colors"
        >
          Upload document
        </button>
        <button
          onClick={() => onCreate('web')}
          className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-600"
        >
          Ingest web page
        </button>
      </div>
    </div>
  );
}

interface IngestFormProps {
  ingestType: IngestType;
  ingestUrl: string;
  loading: boolean;
  uploadProgress: number | null;
  error: string | null;
  fileToIngest: File | null;
  onTypeChange(type: IngestType): void;
  onUrlChange(value: string): void;
  onFileSelect(event: React.ChangeEvent<HTMLInputElement>): void;
  onSubmit(): void;
  onCancel(): void;
  onEdit?(file: File): void;
  onOCR?(file: File): void;
}

function IngestForm({
  ingestType,
  ingestUrl,
  loading,
  uploadProgress,
  error,
  fileToIngest,
  onTypeChange,
  onUrlChange,
  onFileSelect,
  onSubmit,
  onCancel,
  onEdit,
  onOCR: _onOCR,
}: IngestFormProps) {
  return (
    <div className="flex max-w-3xl flex-col gap-6 px-10 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100">Ingest document</h2>
          <p className="text-sm text-gray-400">
            Ingest a file or web article to analyze claims and generate verification reports.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="rounded-full border border-gray-700 bg-gray-800/40 p-2 text-gray-400 hover:bg-gray-800/60"
        >
          <X size={16} />
        </button>
      </div>

      <div className="rounded border border-gray-800/60 bg-gray-900/40 p-6">
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Source type
        </label>
        <div className="flex gap-3">
          {(['pdf', 'docx', 'web'] as IngestType[]).map(type => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                ingestType === type
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-200'
                  : 'border-gray-700/50 bg-gray-800/40 text-gray-300 hover:border-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {ingestType === 'web' ? (
        <div className="rounded border border-gray-800/60 bg-gray-900/40 p-6">
          <label className="block text-sm font-medium text-gray-300">Web URL</label>
          <input
            type="url"
            value={ingestUrl}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://example.com/article"
            className="mt-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Regen will fetch the article, strip boilerplate, and analyze claims.
          </p>
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-700 bg-gray-900/30 p-6 text-center">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Upload {ingestType.toUpperCase()} file
          </label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={onFileSelect}
            className="mx-auto block text-sm text-gray-300"
          />
          {fileToIngest && (
            <div className="mt-3 flex items-center justify-between rounded border border-slate-700 bg-slate-800/50 p-3">
              <div>
                <p className="text-xs text-gray-300">{fileToIngest.name}</p>
                <p className="text-xs text-gray-500">{Math.round(fileToIngest.size / 1024)} KB</p>
              </div>
              {onEdit && (
                <button
                  onClick={() => onEdit(fileToIngest)}
                  className="rounded border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-500/20"
                >
                  Edit with AI
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Ingest'}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-600"
        >
          Cancel
        </button>
        {uploadProgress !== null && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={14} className="animate-spin text-purple-400" />
            <span>Progress {uploadProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentReviewViewProps {
  review: DocumentReview;
  onReverify(): void;
  onExport(
    format: 'markdown' | 'html',
    style: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard'
  ): void;
  onDelete(): void;
}

function DocumentReviewView({ review, onReverify, onExport, onDelete }: DocumentReviewViewProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  useEffect(() => {
    if (review.type === 'pdf') {
      setPdfPath(`regen://document/${review.id}`);
    } else {
      setPdfPath(null);
    }
  }, [review]);

  const timeline = review.timeline ?? [];
  const factHighlights = review.factHighlights ?? [];
  const assumptions = review.assumptions ?? [];
  const auditTrail = review.auditTrail ?? [];
  const entityGraph = useMemo(() => {
    if (review.entityGraph) return review.entityGraph;
    return review.entities.map(entity => ({
      name: entity.name,
      count: entity.occurrences.length,
      type: entity.type,
      connections: review.claims
        .filter(claim => claim.text.toLowerCase().includes(entity.name.toLowerCase()))
        .slice(0, 3)
        .map(claim => claim.id),
    }));
  }, [review.entityGraph, review.entities, review.claims]);

  const highlightsBySection = useMemo(
    () => groupHighlightsBySection(factHighlights, review.sections),
    [factHighlights, review.sections]
  );

  const verificationSummary = useMemo(() => {
    const total = review.claims.length;
    const verified = review.claims.filter(c => c.verification.status === 'verified').length;
    const disputed = review.claims.filter(c => c.verification.status === 'disputed').length;
    const unverified = total - verified - disputed;
    return {
      total,
      verified,
      disputed,
      unverified,
    };
  }, [review.claims]);

  useEffect(() => {
    if (!selectedClaimId) return;
    const el = document.getElementById(`highlight-${selectedClaimId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-400', 'ring-offset-1', 'ring-offset-[#1A1D28]');
      const timeout = window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-1', 'ring-offset-[#1A1D28]');
      }, 1800);
      return () => window.clearTimeout(timeout);
    }
  }, [selectedClaimId]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between border-b border-gray-800/40 bg-gray-900/40 px-8 py-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-100">{review.title}</h2>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            {review.type.toUpperCase()} • {review.sections.length} sections •{' '}
            {review.entities.length} entities • {review.claims.length} claims
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>Created {formatDistanceToNow(review.createdAt, { addSuffix: true })}</span>
            <span>Updated {formatDistanceToNow(review.updatedAt, { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReverify}
            className="rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
          >
            Re-run verification
          </button>
          <button
            onClick={() => onExport('markdown', 'apa')}
            className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:border-gray-500"
          >
            Export Markdown
          </button>
          <button
            onClick={() => onExport('html', 'apa')}
            className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:border-gray-500"
          >
            Export HTML
          </button>
          <button
            onClick={onDelete}
            className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-gray-800/40 bg-[#181C27] overflow-y-auto">
          <section className="border-b border-gray-800/40 p-4">
            <span className="block text-xs uppercase tracking-wide text-gray-500">
              Verification summary
            </span>
            <div className="mt-3 space-y-2 text-xs">
              <SummaryRow label="Total claims" value={verificationSummary.total} />
              <SummaryRow label="Verified" value={verificationSummary.verified} tone="success" />
              <SummaryRow label="Disputed" value={verificationSummary.disputed} tone="warning" />
              <SummaryRow
                label="Unverified"
                value={verificationSummary.unverified}
                tone="neutral"
              />
            </div>
          </section>

          {factHighlights.length > 0 && (
            <FactHighlightsPanel
              highlights={factHighlights}
              selectedId={selectedClaimId}
              onSelect={setSelectedClaimId}
            />
          )}

          {assumptions.length > 0 && (
            <AssumptionsPanel assumptions={assumptions} onSelect={setSelectedClaimId} />
          )}

          <EntityGraphPanel graph={entityGraph} onSelect={setSelectedClaimId} />
          <TimelinePanel timeline={timeline} />
        </aside>

        <section className="flex-1 overflow-y-auto">
          <article className="space-y-6 p-8">
            {review.sections.map((section, idx) => {
              const sectionHighlights = highlightsBySection.get(section.title) ?? [];
              const headingSize = Math.max(2, 4 - Math.min(section.level, 3));
              return (
                <div key={section.title + idx} className="space-y-2">
                  <h3 className={`font-semibold text-gray-100 text-${headingSize}xl`}>
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {renderSectionContent(section, sectionHighlights, selectedClaimId)}
                  </p>
                </div>
              );
            })}
          </article>

          {auditTrail.length > 0 && (
            <AuditTrailTable auditTrail={auditTrail} onSelect={setSelectedClaimId} />
          )}
        </section>

        <aside className="w-96 border-l border-gray-800/40 bg-[#181C27] flex flex-col">
          <header className="flex items-center justify-between border-b border-gray-800/40 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-100">Claim verification</h3>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              {showComments ? 'Hide comments' : 'Show comments'}
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-800/40">
              {review.claims.map(claim => (
                <motion.li
                  key={claim.id}
                  layout
                  className={`cursor-pointer px-5 py-4 hover:bg-gray-800/30 transition-colors ${
                    selectedClaimId === claim.id ? 'bg-gray-800/50' : ''
                  }`}
                  onClick={() => setSelectedClaimId(claim.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Claim</span>
                    <StatusPill status={claim.verification.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-200 leading-relaxed line-clamp-3">
                    {claim.text}
                  </p>
                  <div className="mt-2 text-[11px] text-gray-500">
                    Confidence {(claim.verification.confidence * 100).toFixed(0)}% •{' '}
                    {claim.section || 'Unknown section'}
                  </div>
                  <div className="mt-3 space-y-1">
                    {claim.verification.sources.slice(0, 3).map((source, idx) => (
                      <div
                        key={`${claim.id}-src-${idx}`}
                        className="flex items-center gap-2 text-[11px] text-gray-400"
                      >
                        <span className={source.supports ? 'text-emerald-400' : 'text-amber-400'}>
                          {source.supports ? 'Supports' : 'Disputes'}
                        </span>
                        <span className="line-clamp-1">{source.title}</span>
                      </div>
                    ))}
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          {showComments && (
            <CommentsPanel
              comments={comments}
              onAddComment={comment => {
                setComments(prev => [
                  ...prev,
                  {
                    id: `comment_${Date.now()}`,
                    createdAt: Date.now(),
                    ...comment,
                  },
                ]);
              }}
              onDeleteComment={id => setComments(prev => prev.filter(comment => comment.id !== id))}
              currentPage={1}
            />
          )}
        </aside>
      </div>

      {pdfPath && (
        <AnimatePresence>
          <motion.div
            key="pdf"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-6 z-50 overflow-hidden rounded-xl border border-gray-700/70 bg-[#0F131F]/95 shadow-2xl backdrop-blur"
          >
            <header className="flex items-center justify-between border-b border-gray-800/60 px-4 py-2 text-sm text-gray-300">
              <span>Document viewer</span>
              <button
                onClick={() => setPdfPath(null)}
                className="rounded-full border border-gray-700 bg-gray-800/50 p-1 text-gray-400 hover:bg-gray-800/70"
              >
                <X size={14} />
              </button>
            </header>
            <PDFViewer filePath={pdfPath} onPageChange={() => {}} />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function groupHighlightsBySection(
  highlights: FactHighlight[],
  sections: DocumentReview['sections']
) {
  const map = new Map<string, FactHighlight[]>();
  if (highlights.length === 0) return map;

  highlights.forEach(highlight => {
    const section =
      sections.find(
        sec => highlight.position >= sec.startPosition && highlight.position < sec.endPosition
      ) || sections.find(sec => sec.title === highlight.section);
    const key = section?.title || highlight.section || 'Document';
    const list = map.get(key) ?? [];
    list.push(highlight);
    map.set(key, list);
  });

  return map;
}

const highlightTone: Record<FactHighlight['importance'], string> = {
  verified: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30',
  disputed: 'bg-amber-500/20 text-amber-100 border border-amber-500/30',
  unverified: 'bg-slate-500/20 text-slate-100 border border-slate-500/30',
};

function renderSectionContent(
  section: DocumentReview['sections'][number],
  highlights: FactHighlight[],
  activeClaimId: string | null
) {
  if (highlights.length === 0) return section.content.trim();

  const content = section.content;
  const lower = content.toLowerCase();
  const sorted = [...highlights].sort((a, b) => a.position - b.position);
  const nodes: Array<string | JSX.Element> = [];
  let cursor = 0;

  sorted.forEach(highlight => {
    const needle = highlight.text.trim();
    if (!needle) return;

    const search = needle.toLowerCase();
    let index = lower.indexOf(search, cursor);
    if (index === -1) {
      index = lower.indexOf(search, 0);
      if (index === -1) return;
    }

    if (index > cursor) {
      nodes.push(content.slice(cursor, index));
    }

    const markedText = content.slice(index, index + needle.length);
    nodes.push(
      <mark
        key={`${highlight.claimId}-${index}`}
        id={`highlight-${highlight.claimId}`}
        className={`rounded px-1 ${highlightTone[highlight.importance]} ${
          activeClaimId === highlight.claimId
            ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#1A1D28]'
            : ''
        }`}
      >
        {markedText}
      </mark>
    );
    cursor = index + needle.length;
  });

  if (cursor < content.length) {
    nodes.push(content.slice(cursor));
  }

  return nodes;
}

function FactHighlightsPanel({
  highlights,
  selectedId,
  onSelect,
}: {
  highlights: FactHighlight[];
  selectedId: string | null;
  onSelect(id: string): void;
}) {
  const ordered = [...highlights].sort((a, b) => {
    const rank = { verified: 0, disputed: 1, unverified: 2 } as const;
    return rank[a.importance] - rank[b.importance];
  });

  return (
    <section className="border-b border-gray-800/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-200">
        <Highlighter size={14} />
        <span className="text-xs uppercase tracking-wide">Fact highlights</span>
      </div>
      <ul className="space-y-2 text-xs">
        {ordered.map(highlight => (
          <li key={highlight.claimId}>
            <button
              onClick={() => onSelect(highlight.claimId)}
              className={`w-full rounded border px-2 py-2 text-left transition-colors ${
                selectedId === highlight.claimId
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-100'
                  : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100 hover:bg-emerald-500/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{highlight.section || 'Document'}</span>
                <span className="text-[10px] uppercase tracking-wide">{highlight.importance}</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-100/90 line-clamp-3">{highlight.text}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const assumptionTone: Record<AssumptionHighlight['severity'], string> = {
  low: 'border-sky-500/30 bg-sky-500/5 text-sky-100',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  high: 'border-red-500/40 bg-red-500/10 text-red-100',
};

function AssumptionsPanel({
  assumptions,
  onSelect,
}: {
  assumptions: AssumptionHighlight[];
  onSelect(id: string): void;
}) {
  return (
    <section className="border-b border-gray-800/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-200">
        <AlertTriangle size={14} />
        <span className="text-xs uppercase tracking-wide">Assumptions & gaps</span>
      </div>
      <ul className="space-y-2 text-xs">
        {assumptions.map(assumption => (
          <li key={assumption.claimId}>
            <button
              onClick={() => onSelect(assumption.claimId)}
              className={`w-full rounded border px-2 py-2 text-left ${assumptionTone[assumption.severity]} hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{assumption.section || 'Document'}</span>
                <span className="text-[10px] uppercase tracking-wide">{assumption.severity}</span>
              </div>
              <p className="mt-1 text-[11px] opacity-90">{assumption.text}</p>
              <p className="mt-1 text-[10px] opacity-70">{assumption.rationale}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EntityGraphPanel({
  graph,
  onSelect,
}: {
  graph: NonNullable<DocumentReview['entityGraph']>;
  onSelect(id: string): void;
}) {
  return (
    <section className="border-b border-gray-800/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-200">
        <GitBranch size={14} />
        <span className="text-xs uppercase tracking-wide">Entity graph</span>
      </div>
      <ul className="space-y-2 text-xs text-gray-300">
        {graph.slice(0, 12).map(node => (
          <li key={node.name} className="rounded border border-blue-500/30 bg-blue-500/5 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-100">{node.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-blue-200">
                {node.type} • {node.count}
              </span>
            </div>
            {node.connections.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {node.connections.map(connection => (
                  <button
                    key={connection}
                    onClick={() => onSelect(connection)}
                    className="rounded-full border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-100 hover:bg-blue-500/20"
                  >
                    Jump to claim
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimelinePanel({ timeline }: { timeline: DocumentReview['timeline'] }) {
  return (
    <section className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-gray-300">
        <Clock3 size={14} />
        <span className="text-xs uppercase tracking-wide">Timeline events</span>
      </div>
      {timeline.length === 0 ? (
        <div className="text-xs text-gray-500">No events detected.</div>
      ) : (
        <ul className="space-y-3 text-xs text-gray-300">
          {timeline.map((event, idx) => (
            <li key={`${event.date}-${idx}`} className="relative pl-4">
              <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-purple-400" />
              <div className="font-semibold text-gray-200">{event.date}</div>
              <div className="text-[11px] text-gray-400">{event.description}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuditTrailTable({
  auditTrail,
  onSelect,
}: {
  auditTrail: AuditTrailEntry[];
  onSelect(id: string): void;
}) {
  return (
    <section className="px-8 pb-8">
      <div className="rounded border border-gray-800 bg-neutral-900/40">
        <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-200">
            <BookOpenCheck size={16} />
            <h3 className="text-sm font-semibold">Audit trail</h3>
          </div>
          <span className="text-[11px] text-gray-500">Linked to source evidence</span>
        </header>
        <div className="max-h-64 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-800 text-xs text-gray-300">
            <thead className="bg-neutral-900/80 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Claim</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {auditTrail.map(entry => (
                <tr key={entry.claimId} className="hover:bg-neutral-800/40">
                  <td className="px-3 py-2">
                    <button
                      className="text-indigo-200 hover:text-indigo-100"
                      onClick={() => onSelect(entry.claimId)}
                    >
                      Claim {entry.claimId.split('_').pop()}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-400">
                    {entry.section || '—'}
                    {entry.page !== undefined && <span className="ml-1">• p.{entry.page}</span>}
                    {entry.line !== undefined && <span className="ml-1">• line {entry.line}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={entry.status} />
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-400">
                    {entry.link ? (
                      <a
                        href={entry.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 hover:text-indigo-100"
                      >
                        Open source
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const color =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : 'text-gray-300';
  return (
    <div className="flex items-center justify-between text-xs text-gray-400">
      <span>{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: DocumentReview['claims'][number]['verification']['status'];
}) {
  const tone =
    status === 'verified'
      ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
      : status === 'disputed'
        ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
        : 'bg-gray-500/10 text-gray-300 border-gray-500/30';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}
