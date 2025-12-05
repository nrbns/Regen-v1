import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { FilePlus, Globe, Loader2, Shield, UploadCloud, X, Highlighter, AlertTriangle, GitBranch, Clock3, BookOpenCheck, } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { PDFViewer } from '../../components/DocumentViewer/PDFViewer';
import { CommentsPanel } from '../../components/DocumentViewer/CommentsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
export default function DocsPanel() {
    const [viewMode, setViewMode] = useState('list');
    const [reviews, setReviews] = useState([]);
    const [activeReview, setActiveReview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [ingestType, setIngestType] = useState('pdf');
    const [ingestUrl, setIngestUrl] = useState('');
    const [fileToIngest, setFileToIngest] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    useEffect(() => {
        const loadReviews = async () => {
            try {
                const list = await ipc.document.list();
                setReviews(list);
            }
            catch (err) {
                console.error('Failed to load document reviews', err);
            }
        };
        void loadReviews();
    }, []);
    const handleSelectReview = (review) => {
        setActiveReview(review);
        setViewMode('review');
    };
    const handleStartIngest = (type) => {
        setError(null);
        setUploadProgress(null);
        setFileToIngest(null);
        setIngestUrl('');
        setIngestType(type);
        setViewMode('ingest');
    };
    const handleFileSelect = (event) => {
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
            let payloadSource = '';
            let payloadType = ingestType;
            if (ingestType === 'web') {
                if (!ingestUrl.trim()) {
                    setError('Please enter a URL to ingest.');
                    setLoading(false);
                    return;
                }
                payloadSource = ingestUrl.trim();
            }
            else {
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
            const review = await ipc.document.ingest(payloadSource, payloadType, fileToIngest?.name || ingestUrl || undefined);
            setUploadProgress(90);
            const reviewData = review;
            setReviews(prev => [reviewData, ...prev]);
            setActiveReview(reviewData);
            setViewMode('review');
        }
        catch (err) {
            console.error('Document ingest failed', err);
            setError(err?.message || 'Failed to ingest document.');
        }
        finally {
            setUploadProgress(100);
            setTimeout(() => setUploadProgress(null), 800);
            setLoading(false);
        }
    };
    const handleDeleteReview = async (review) => {
        if (!confirm(`Delete "${review.title}"?`))
            return;
        try {
            await ipc.document.delete({ id: review.id });
            setReviews(prev => prev.filter(r => r.id !== review.id));
            if (activeReview?.id === review.id) {
                setActiveReview(null);
                setViewMode('list');
            }
        }
        catch (err) {
            console.error('Failed to delete review', err);
        }
    };
    return (_jsxs("div", { className: "flex h-full bg-[#1A1D28] text-gray-100 overflow-hidden", children: [_jsx(Sidebar, { reviews: reviews, activeReview: activeReview, onSelectReview: handleSelectReview, onCreate: handleStartIngest }), _jsxs("main", { className: "flex-1 overflow-y-auto", children: [viewMode === 'list' && _jsx(EmptyState, { onCreate: handleStartIngest }), viewMode === 'ingest' && (_jsx(IngestForm, { ingestType: ingestType, ingestUrl: ingestUrl, loading: loading, uploadProgress: uploadProgress, error: error, fileToIngest: fileToIngest, onTypeChange: setIngestType, onUrlChange: setIngestUrl, onFileSelect: handleFileSelect, onSubmit: handleIngest, onCancel: handleIngestCancel })), viewMode === 'review' && activeReview && (_jsx(DocumentReviewView, { review: activeReview, onReverify: async () => {
                            try {
                                setLoading(true);
                                const updated = await ipc.document.reverify({ id: activeReview.id });
                                const newReview = updated;
                                setActiveReview(newReview);
                                setReviews(prev => prev.map(r => (r.id === newReview.id ? newReview : r)));
                            }
                            catch (err) {
                                console.error('Reverify failed', err);
                            }
                            finally {
                                setLoading(false);
                            }
                        }, onExport: async (format, style) => {
                            try {
                                setLoading(true);
                                const outputPath = window.prompt('Save to path', `~/Documents/${activeReview.title}.${format === 'markdown' ? 'md' : 'html'}`);
                                if (!outputPath)
                                    return;
                                await ipc.document.export(activeReview.id, format, outputPath, style);
                                alert('Export completed successfully');
                            }
                            catch (err) {
                                console.error('Export failed', err);
                                alert('Export failed. Check console for details.');
                            }
                            finally {
                                setLoading(false);
                            }
                        }, onDelete: () => activeReview && handleDeleteReview(activeReview) }))] })] }));
}
function Sidebar({ reviews, activeReview, onSelectReview, onCreate }) {
    return (_jsxs("aside", { className: "w-80 border-r border-gray-800/40 bg-[#161924] flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-800/40", children: [_jsx("h1", { className: "text-lg font-semibold", children: "Document Review" }), _jsx("p", { className: "text-xs text-gray-500", children: "Ingest, analyze, and verify documents" }), _jsxs("div", { className: "mt-3 grid grid-cols-3 gap-2 text-xs", children: [_jsxs("button", { onClick: () => onCreate('pdf'), className: "flex items-center justify-center gap-1 rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-indigo-200 hover:bg-indigo-500/20", children: [_jsx(FilePlus, { size: 12 }), "PDF"] }), _jsxs("button", { onClick: () => onCreate('docx'), className: "flex items-center justify-center gap-1 rounded border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-purple-200 hover:bg-purple-500/20", children: [_jsx(UploadCloud, { size: 12 }), "DOCX"] }), _jsxs("button", { onClick: () => onCreate('web'), className: "flex items-center justify-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20", children: [_jsx(Globe, { size: 12 }), "Web"] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: reviews.length === 0 ? (_jsx("div", { className: "p-4 text-xs text-gray-500", children: "No documents yet. Ingest a PDF, DOCX, or web article to begin." })) : (_jsx("ul", { children: reviews.map(review => (_jsx("li", { children: _jsxs("button", { onClick: () => onSelectReview(review), className: `w-full text-left px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors ${activeReview?.id === review.id ? 'bg-gray-800/50' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsx("span", { className: "uppercase tracking-wide text-[10px] text-gray-500", children: review.type }), _jsx("span", { children: formatDistanceToNow(review.updatedAt, { addSuffix: true }) })] }), _jsx("div", { className: "mt-1 font-medium text-sm text-gray-100 line-clamp-2", children: review.title }), _jsxs("div", { className: "mt-2 text-[11px] text-gray-500", children: [review.sections.length, " sections \u2022 ", review.claims.length, " claims"] })] }) }, review.id))) })) })] }));
}
function EmptyState({ onCreate }) {
    return (_jsxs("div", { className: "flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-gray-400", children: [_jsx("div", { className: "rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-6", children: _jsx(Shield, { size: 48, className: "text-purple-400" }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-100", children: "Start your first review" }), _jsx("p", { children: "Upload a PDF/DOCX or ingest a web article to analyze claims, entities, and timelines." })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => onCreate('pdf'), className: "rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 transition-colors", children: "Upload document" }), _jsx("button", { onClick: () => onCreate('web'), className: "rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-600", children: "Ingest web page" })] })] }));
}
function IngestForm({ ingestType, ingestUrl, loading, uploadProgress, error, fileToIngest, onTypeChange, onUrlChange, onFileSelect, onSubmit, onCancel, }) {
    return (_jsxs("div", { className: "flex max-w-3xl flex-col gap-6 px-10 py-12", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold text-gray-100", children: "Ingest document" }), _jsx("p", { className: "text-sm text-gray-400", children: "Ingest a file or web article to analyze claims and generate verification reports." })] }), _jsx("button", { onClick: onCancel, className: "rounded-full border border-gray-700 bg-gray-800/40 p-2 text-gray-400 hover:bg-gray-800/60", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "rounded border border-gray-800/60 bg-gray-900/40 p-6", children: [_jsx("label", { className: "mb-3 block text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Source type" }), _jsx("div", { className: "flex gap-3", children: ['pdf', 'docx', 'web'].map(type => (_jsx("button", { onClick: () => onTypeChange(type), className: `rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${ingestType === type
                                ? 'border-purple-500/50 bg-purple-500/10 text-purple-200'
                                : 'border-gray-700/50 bg-gray-800/40 text-gray-300 hover:border-gray-600'}`, children: type }, type))) })] }), ingestType === 'web' ? (_jsxs("div", { className: "rounded border border-gray-800/60 bg-gray-900/40 p-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-300", children: "Web URL" }), _jsx("input", { type: "url", value: ingestUrl, onChange: e => onUrlChange(e.target.value), placeholder: "https://example.com/article", className: "mt-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" }), _jsx("p", { className: "mt-2 text-xs text-gray-500", children: "Regen will fetch the article, strip boilerplate, and analyze claims." })] })) : (_jsxs("div", { className: "rounded border border-dashed border-gray-700 bg-gray-900/30 p-6 text-center", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-300 mb-3", children: ["Upload ", ingestType.toUpperCase(), " file"] }), _jsx("input", { type: "file", accept: ".pdf,.docx", onChange: onFileSelect, className: "mx-auto block text-sm text-gray-300" }), fileToIngest && (_jsxs("p", { className: "mt-3 text-xs text-gray-400", children: ["Selected: ", fileToIngest.name, " (", Math.round(fileToIngest.size / 1024), " KB)"] }))] })), error && (_jsx("div", { className: "rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200", children: error })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: onSubmit, disabled: loading, className: "rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-500 disabled:opacity-50", children: loading ? 'Processing…' : 'Ingest' }), _jsx("button", { onClick: onCancel, className: "rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-600", children: "Cancel" }), uploadProgress !== null && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: [_jsx(Loader2, { size: 14, className: "animate-spin text-purple-400" }), _jsxs("span", { children: ["Progress ", uploadProgress, "%"] })] }))] })] }));
}
function DocumentReviewView({ review, onReverify, onExport, onDelete }) {
    const [selectedClaimId, setSelectedClaimId] = useState(null);
    const [showComments, setShowComments] = useState(true);
    const [comments, setComments] = useState([]);
    const [pdfPath, setPdfPath] = useState(null);
    useEffect(() => {
        if (review.type === 'pdf') {
            setPdfPath(`regen://document/${review.id}`);
        }
        else {
            setPdfPath(null);
        }
    }, [review]);
    const timeline = review.timeline ?? [];
    const factHighlights = review.factHighlights ?? [];
    const assumptions = review.assumptions ?? [];
    const auditTrail = review.auditTrail ?? [];
    const entityGraph = useMemo(() => {
        if (review.entityGraph)
            return review.entityGraph;
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
    const highlightsBySection = useMemo(() => groupHighlightsBySection(factHighlights, review.sections), [factHighlights, review.sections]);
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
        if (!selectedClaimId)
            return;
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
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("header", { className: "flex items-start justify-between border-b border-gray-800/40 bg-gray-900/40 px-8 py-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-2xl font-semibold text-gray-100", children: review.title }), _jsxs("div", { className: "text-xs uppercase tracking-wide text-gray-500", children: [review.type.toUpperCase(), " \u2022 ", review.sections.length, " sections \u2022", ' ', review.entities.length, " entities \u2022 ", review.claims.length, " claims"] }), _jsxs("div", { className: "flex gap-3 text-xs text-gray-500", children: [_jsxs("span", { children: ["Created ", formatDistanceToNow(review.createdAt, { addSuffix: true })] }), _jsxs("span", { children: ["Updated ", formatDistanceToNow(review.updatedAt, { addSuffix: true })] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onReverify, className: "rounded border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-200 hover:bg-purple-500/20", children: "Re-run verification" }), _jsx("button", { onClick: () => onExport('markdown', 'apa'), className: "rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:border-gray-500", children: "Export Markdown" }), _jsx("button", { onClick: () => onExport('html', 'apa'), className: "rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:border-gray-500", children: "Export HTML" }), _jsx("button", { onClick: onDelete, className: "rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20", children: "Delete" })] })] }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("aside", { className: "w-72 border-r border-gray-800/40 bg-[#181C27] overflow-y-auto", children: [_jsxs("section", { className: "border-b border-gray-800/40 p-4", children: [_jsx("span", { className: "block text-xs uppercase tracking-wide text-gray-500", children: "Verification summary" }), _jsxs("div", { className: "mt-3 space-y-2 text-xs", children: [_jsx(SummaryRow, { label: "Total claims", value: verificationSummary.total }), _jsx(SummaryRow, { label: "Verified", value: verificationSummary.verified, tone: "success" }), _jsx(SummaryRow, { label: "Disputed", value: verificationSummary.disputed, tone: "warning" }), _jsx(SummaryRow, { label: "Unverified", value: verificationSummary.unverified, tone: "neutral" })] })] }), factHighlights.length > 0 && (_jsx(FactHighlightsPanel, { highlights: factHighlights, selectedId: selectedClaimId, onSelect: setSelectedClaimId })), assumptions.length > 0 && (_jsx(AssumptionsPanel, { assumptions: assumptions, onSelect: setSelectedClaimId })), _jsx(EntityGraphPanel, { graph: entityGraph, onSelect: setSelectedClaimId }), _jsx(TimelinePanel, { timeline: timeline })] }), _jsxs("section", { className: "flex-1 overflow-y-auto", children: [_jsx("article", { className: "space-y-6 p-8", children: review.sections.map((section, idx) => {
                                    const sectionHighlights = highlightsBySection.get(section.title) ?? [];
                                    const headingSize = Math.max(2, 4 - Math.min(section.level, 3));
                                    return (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: `font-semibold text-gray-100 text-${headingSize}xl`, children: section.title }), _jsx("p", { className: "text-sm text-gray-300 leading-relaxed whitespace-pre-wrap", children: renderSectionContent(section, sectionHighlights, selectedClaimId) })] }, section.title + idx));
                                }) }), auditTrail.length > 0 && (_jsx(AuditTrailTable, { auditTrail: auditTrail, onSelect: setSelectedClaimId }))] }), _jsxs("aside", { className: "w-96 border-l border-gray-800/40 bg-[#181C27] flex flex-col", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-gray-800/40 px-5 py-3", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-100", children: "Claim verification" }), _jsx("button", { onClick: () => setShowComments(!showComments), className: "text-xs text-gray-400 hover:text-gray-200", children: showComments ? 'Hide comments' : 'Show comments' })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx("ul", { className: "divide-y divide-gray-800/40", children: review.claims.map(claim => (_jsxs(motion.li, { layout: true, className: `cursor-pointer px-5 py-4 hover:bg-gray-800/30 transition-colors ${selectedClaimId === claim.id ? 'bg-gray-800/50' : ''}`, onClick: () => setSelectedClaimId(claim.id), children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-gray-500", children: "Claim" }), _jsx(StatusPill, { status: claim.verification.status })] }), _jsx("p", { className: "mt-2 text-sm text-gray-200 leading-relaxed line-clamp-3", children: claim.text }), _jsxs("div", { className: "mt-2 text-[11px] text-gray-500", children: ["Confidence ", (claim.verification.confidence * 100).toFixed(0), "% \u2022", ' ', claim.section || 'Unknown section'] }), _jsx("div", { className: "mt-3 space-y-1", children: claim.verification.sources.slice(0, 3).map((source, idx) => (_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-gray-400", children: [_jsx("span", { className: source.supports ? 'text-emerald-400' : 'text-amber-400', children: source.supports ? 'Supports' : 'Disputes' }), _jsx("span", { className: "line-clamp-1", children: source.title })] }, `${claim.id}-src-${idx}`))) })] }, claim.id))) }) }), showComments && (_jsx(CommentsPanel, { comments: comments, onAddComment: comment => {
                                    setComments(prev => [
                                        ...prev,
                                        {
                                            id: `comment_${Date.now()}`,
                                            createdAt: Date.now(),
                                            ...comment,
                                        },
                                    ]);
                                }, onDeleteComment: id => setComments(prev => prev.filter(comment => comment.id !== id)), currentPage: 1 }))] })] }), pdfPath && (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-6 z-50 overflow-hidden rounded-xl border border-gray-700/70 bg-[#0F131F]/95 shadow-2xl backdrop-blur", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-gray-800/60 px-4 py-2 text-sm text-gray-300", children: [_jsx("span", { children: "Document viewer" }), _jsx("button", { onClick: () => setPdfPath(null), className: "rounded-full border border-gray-700 bg-gray-800/50 p-1 text-gray-400 hover:bg-gray-800/70", children: _jsx(X, { size: 14 }) })] }), _jsx(PDFViewer, { filePath: pdfPath, onPageChange: () => { } })] }, "pdf") }))] }));
}
function groupHighlightsBySection(highlights, sections) {
    const map = new Map();
    if (highlights.length === 0)
        return map;
    highlights.forEach(highlight => {
        const section = sections.find(sec => highlight.position >= sec.startPosition && highlight.position < sec.endPosition) || sections.find(sec => sec.title === highlight.section);
        const key = section?.title || highlight.section || 'Document';
        const list = map.get(key) ?? [];
        list.push(highlight);
        map.set(key, list);
    });
    return map;
}
const highlightTone = {
    verified: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30',
    disputed: 'bg-amber-500/20 text-amber-100 border border-amber-500/30',
    unverified: 'bg-slate-500/20 text-slate-100 border border-slate-500/30',
};
function renderSectionContent(section, highlights, activeClaimId) {
    if (highlights.length === 0)
        return section.content.trim();
    const content = section.content;
    const lower = content.toLowerCase();
    const sorted = [...highlights].sort((a, b) => a.position - b.position);
    const nodes = [];
    let cursor = 0;
    sorted.forEach(highlight => {
        const needle = highlight.text.trim();
        if (!needle)
            return;
        const search = needle.toLowerCase();
        let index = lower.indexOf(search, cursor);
        if (index === -1) {
            index = lower.indexOf(search, 0);
            if (index === -1)
                return;
        }
        if (index > cursor) {
            nodes.push(content.slice(cursor, index));
        }
        const markedText = content.slice(index, index + needle.length);
        nodes.push(_jsx("mark", { id: `highlight-${highlight.claimId}`, className: `rounded px-1 ${highlightTone[highlight.importance]} ${activeClaimId === highlight.claimId
                ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#1A1D28]'
                : ''}`, children: markedText }, `${highlight.claimId}-${index}`));
        cursor = index + needle.length;
    });
    if (cursor < content.length) {
        nodes.push(content.slice(cursor));
    }
    return nodes;
}
function FactHighlightsPanel({ highlights, selectedId, onSelect, }) {
    const ordered = [...highlights].sort((a, b) => {
        const rank = { verified: 0, disputed: 1, unverified: 2 };
        return rank[a.importance] - rank[b.importance];
    });
    return (_jsxs("section", { className: "border-b border-gray-800/40 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-200", children: [_jsx(Highlighter, { size: 14 }), _jsx("span", { className: "text-xs uppercase tracking-wide", children: "Fact highlights" })] }), _jsx("ul", { className: "space-y-2 text-xs", children: ordered.map(highlight => (_jsx("li", { children: _jsxs("button", { onClick: () => onSelect(highlight.claimId), className: `w-full rounded border px-2 py-2 text-left transition-colors ${selectedId === highlight.claimId
                            ? 'border-purple-500/40 bg-purple-500/10 text-purple-100'
                            : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100 hover:bg-emerald-500/10'}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold", children: highlight.section || 'Document' }), _jsx("span", { className: "text-[10px] uppercase tracking-wide", children: highlight.importance })] }), _jsx("p", { className: "mt-1 text-[11px] text-emerald-100/90 line-clamp-3", children: highlight.text })] }) }, highlight.claimId))) })] }));
}
const assumptionTone = {
    low: 'border-sky-500/30 bg-sky-500/5 text-sky-100',
    medium: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    high: 'border-red-500/40 bg-red-500/10 text-red-100',
};
function AssumptionsPanel({ assumptions, onSelect, }) {
    return (_jsxs("section", { className: "border-b border-gray-800/40 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-amber-200", children: [_jsx(AlertTriangle, { size: 14 }), _jsx("span", { className: "text-xs uppercase tracking-wide", children: "Assumptions & gaps" })] }), _jsx("ul", { className: "space-y-2 text-xs", children: assumptions.map(assumption => (_jsx("li", { children: _jsxs("button", { onClick: () => onSelect(assumption.claimId), className: `w-full rounded border px-2 py-2 text-left ${assumptionTone[assumption.severity]} hover:opacity-90 transition-opacity`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold", children: assumption.section || 'Document' }), _jsx("span", { className: "text-[10px] uppercase tracking-wide", children: assumption.severity })] }), _jsx("p", { className: "mt-1 text-[11px] opacity-90", children: assumption.text }), _jsx("p", { className: "mt-1 text-[10px] opacity-70", children: assumption.rationale })] }) }, assumption.claimId))) })] }));
}
function EntityGraphPanel({ graph, onSelect, }) {
    return (_jsxs("section", { className: "border-b border-gray-800/40 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-blue-200", children: [_jsx(GitBranch, { size: 14 }), _jsx("span", { className: "text-xs uppercase tracking-wide", children: "Entity graph" })] }), _jsx("ul", { className: "space-y-2 text-xs text-gray-300", children: graph.slice(0, 12).map(node => (_jsxs("li", { className: "rounded border border-blue-500/30 bg-blue-500/5 px-2 py-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold text-blue-100", children: node.name }), _jsxs("span", { className: "text-[10px] uppercase tracking-wide text-blue-200", children: [node.type, " \u2022 ", node.count] })] }), node.connections.length > 0 && (_jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: node.connections.map(connection => (_jsx("button", { onClick: () => onSelect(connection), className: "rounded-full border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-100 hover:bg-blue-500/20", children: "Jump to claim" }, connection))) }))] }, node.name))) })] }));
}
function TimelinePanel({ timeline }) {
    return (_jsxs("section", { className: "p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-300", children: [_jsx(Clock3, { size: 14 }), _jsx("span", { className: "text-xs uppercase tracking-wide", children: "Timeline events" })] }), timeline.length === 0 ? (_jsx("div", { className: "text-xs text-gray-500", children: "No events detected." })) : (_jsx("ul", { className: "space-y-3 text-xs text-gray-300", children: timeline.map((event, idx) => (_jsxs("li", { className: "relative pl-4", children: [_jsx("span", { className: "absolute left-0 top-1 h-2 w-2 rounded-full bg-purple-400" }), _jsx("div", { className: "font-semibold text-gray-200", children: event.date }), _jsx("div", { className: "text-[11px] text-gray-400", children: event.description })] }, `${event.date}-${idx}`))) }))] }));
}
function AuditTrailTable({ auditTrail, onSelect, }) {
    return (_jsx("section", { className: "px-8 pb-8", children: _jsxs("div", { className: "rounded border border-gray-800 bg-neutral-900/40", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-gray-800 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-200", children: [_jsx(BookOpenCheck, { size: 16 }), _jsx("h3", { className: "text-sm font-semibold", children: "Audit trail" })] }), _jsx("span", { className: "text-[11px] text-gray-500", children: "Linked to source evidence" })] }), _jsx("div", { className: "max-h-64 overflow-y-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-800 text-xs text-gray-300", children: [_jsx("thead", { className: "bg-neutral-900/80 text-[11px] uppercase tracking-wide text-gray-500", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Claim" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Location" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Status" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Source" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-800", children: auditTrail.map(entry => (_jsxs("tr", { className: "hover:bg-neutral-800/40", children: [_jsx("td", { className: "px-3 py-2", children: _jsxs("button", { className: "text-indigo-200 hover:text-indigo-100", onClick: () => onSelect(entry.claimId), children: ["Claim ", entry.claimId.split('_').pop()] }) }), _jsxs("td", { className: "px-3 py-2 text-[11px] text-gray-400", children: [entry.section || '—', entry.page !== undefined && _jsxs("span", { className: "ml-1", children: ["\u2022 p.", entry.page] }), entry.line !== undefined && _jsxs("span", { className: "ml-1", children: ["\u2022 line ", entry.line] })] }), _jsx("td", { className: "px-3 py-2", children: _jsx(StatusPill, { status: entry.status }) }), _jsx("td", { className: "px-3 py-2 text-[11px] text-gray-400", children: entry.link ? (_jsx("a", { href: entry.link, target: "_blank", rel: "noreferrer", className: "text-indigo-300 hover:text-indigo-100", children: "Open source" })) : ('—') })] }, entry.claimId))) })] }) })] }) }));
}
function SummaryRow({ label, value, tone = 'neutral', }) {
    const color = tone === 'success'
        ? 'text-emerald-300'
        : tone === 'warning'
            ? 'text-amber-300'
            : 'text-gray-300';
    return (_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsx("span", { children: label }), _jsx("span", { className: `font-semibold ${color}`, children: value })] }));
}
function StatusPill({ status, }) {
    const tone = status === 'verified'
        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
        : status === 'disputed'
            ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
            : 'bg-gray-500/10 text-gray-300 border-gray-500/30';
    return (_jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`, children: status }));
}
