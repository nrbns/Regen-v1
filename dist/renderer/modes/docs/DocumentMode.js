import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Document Mode - Tier 3 Pillar 2
 * PDF/document upload and AI digestion
 */
import { useState } from 'react';
import { FileText, Upload, Sparkles, FileCheck } from 'lucide-react';
import { EmptyStates } from '../../components/empty-states/EmptyState';
export function DocumentMode() {
    const [documents, setDocuments] = useState([]);
    const [_uploading, setUploading] = useState(false);
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0)
            return;
        setUploading(true);
        try {
            // TODO: Implement actual upload and processing
            const newDocs = Array.from(files).map(file => ({
                id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: Date.now(),
                processed: false,
            }));
            setDocuments(prev => [...prev, ...newDocs]);
        }
        catch (error) {
            console.error('Failed to upload documents', error);
        }
        finally {
            setUploading(false);
        }
    };
    if (documents.length === 0) {
        return (_jsx("div", { className: "h-full w-full", children: _jsx(EmptyStates.NoDocuments, { onUpload: handleFileUpload }) }));
    }
    return (_jsxs("div", { className: "flex h-full w-full bg-slate-950", children: [_jsxs("div", { className: "w-80 border-r border-slate-800 p-4", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Documents" }), _jsxs("label", { className: "cursor-pointer rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700", children: [_jsx(Upload, { size: 16, className: "mr-1 inline" }), "Upload", _jsx("input", { type: "file", multiple: true, accept: ".pdf,.docx,.txt,.md", onChange: e => handleFileUpload(e.target.files), className: "hidden" })] })] }), _jsx("div", { className: "space-y-2", children: documents.map(doc => (_jsx("div", { className: "cursor-pointer rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:bg-slate-900", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { size: 16, className: "text-purple-400" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm text-white", children: doc.name }), _jsxs("p", { className: "text-xs text-slate-400", children: [(doc.size / 1024).toFixed(1), " KB"] })] }), doc.processed && _jsx(FileCheck, { size: 14, className: "text-green-400" })] }) }, doc.id))) })] }), _jsx("div", { className: "flex-1 p-4", children: _jsxs("div", { className: "h-full rounded-lg border border-slate-800 bg-slate-900/50 p-6", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx(Sparkles, { size: 20, className: "text-purple-400" }), _jsx("h3", { className: "text-lg font-semibold text-white", children: "AI Analysis" })] }), _jsx("p", { className: "text-slate-400", children: "Select a document to see AI-powered analysis, summaries, and extracted information." })] }) })] }));
}
// Add to EmptyStates
export const NoDocuments = ({ onUpload }) => (_jsxs("div", { className: "flex h-full flex-col items-center justify-center", children: [_jsx("div", { className: "mb-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-4", children: _jsx(FileText, { size: 48, className: "text-purple-300" }) }), _jsx("h3", { className: "mb-2 text-xl font-semibold text-white", children: "No documents yet" }), _jsx("p", { className: "mb-6 max-w-md text-center text-slate-400", children: "Upload PDFs, documents, or text files to get AI-powered summaries and analysis." }), _jsxs("label", { className: "cursor-pointer rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-3 font-medium text-white shadow-lg shadow-purple-500/30 transition-all hover:from-purple-600 hover:to-cyan-600", children: [_jsx(Upload, { size: 18, className: "mr-2 inline" }), "Upload Documents", _jsx("input", { type: "file", multiple: true, accept: ".pdf,.docx,.txt,.md", onChange: e => onUpload(e.target.files), className: "hidden" })] })] }));
