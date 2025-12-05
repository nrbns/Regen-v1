import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Document Auto-Edit Component
 * Main UI for uploading, editing, and previewing documents
 */
import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Download, Eye, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '../../utils/toast';
import { ConsentModal } from './ConsentModal';
export function DocumentEditor() {
    const [file, setFile] = useState(null);
    const [task, setTask] = useState('rewrite');
    // Listen for command palette commands
    useEffect(() => {
        const handleDocCommand = (e) => {
            if (e.detail?.task) {
                setTask(e.detail.task);
                toast.info(`Task set to: ${e.detail.task}`);
            }
        };
        window.addEventListener('doc-command', handleDocCommand);
        return () => {
            window.removeEventListener('doc-command', handleDocCommand);
        };
    }, []);
    const [style, setStyle] = useState('preserve');
    const [language, setLanguage] = useState('en');
    const [cloudLLM, setCloudLLM] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const handleFileSelect = useCallback((e) => {
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
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(docx|pdf|xlsx|txt|md)$/i)) {
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
        if (!file)
            return;
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
        }
        catch (error) {
            console.error('[DocumentEditor] Edit failed:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to process document');
        }
        finally {
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
        if (!result)
            return;
        try {
            const response = await fetch(result.downloadUrl);
            if (!response.ok)
                throw new Error('Download failed');
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
        }
        catch {
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
    return (_jsxs("div", { className: "flex flex-col h-full bg-slate-950 text-white", children: [_jsxs("div", { className: "border-b border-slate-800 p-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Document Auto-Edit" }), _jsx("p", { className: "text-sm text-slate-400 mt-1", children: "AI-powered document editing: rewrite, grammar, summarize, translate, and more" })] }), _jsx("div", { className: "flex-1 overflow-auto p-6", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs("div", { className: "border border-slate-800 rounded-lg p-6 bg-slate-900/50", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Upload Document" }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("label", { className: "flex-1 cursor-pointer", children: [_jsx("input", { type: "file", accept: ".docx,.pdf,.xlsx,.txt,.md", onChange: handleFileSelect, className: "hidden" }), _jsx("div", { className: "border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors", children: file ? (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FileText, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { className: "text-left", children: [_jsx("p", { className: "font-medium", children: file.name }), _jsxs("p", { className: "text-sm text-slate-400", children: [(file.size / 1024).toFixed(1), " KB"] })] })] })) : (_jsxs("div", { children: [_jsx(Upload, { className: "h-12 w-12 mx-auto mb-2 text-slate-500" }), _jsx("p", { className: "text-slate-400", children: "Click to upload or drag and drop" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "DOCX, PDF, XLSX, TXT, MD (max 100MB)" })] })) })] }) })] }), file && (_jsxs("div", { className: "border border-slate-800 rounded-lg p-6 bg-slate-900/50 space-y-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Edit Options" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Edit Task" }), _jsxs("select", { value: task, onChange: (e) => setTask(e.target.value), className: "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white", children: [_jsx("option", { value: "rewrite", children: "Rewrite" }), _jsx("option", { value: "grammar", children: "Fix Grammar" }), _jsx("option", { value: "summarize", children: "Summarize" }), _jsx("option", { value: "expand", children: "Expand" }), _jsx("option", { value: "translate", children: "Translate" }), _jsx("option", { value: "formal", children: "Make Formal" }), _jsx("option", { value: "casual", children: "Make Casual" }), _jsx("option", { value: "concise", children: "Make Concise" }), _jsx("option", { value: "bulletize", children: "Convert to Bullets" }), _jsx("option", { value: "normalize", children: "Normalize (Excel)" })] })] }), task === 'rewrite' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Style" }), _jsxs("select", { value: style, onChange: (e) => setStyle(e.target.value), className: "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white", children: [_jsx("option", { value: "preserve", children: "Preserve Original" }), _jsx("option", { value: "formal", children: "Formal" }), _jsx("option", { value: "casual", children: "Casual" }), _jsx("option", { value: "concise", children: "Concise" }), _jsx("option", { value: "professional", children: "Professional" })] })] })), task === 'translate' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Target Language" }), _jsxs("select", { value: language, onChange: (e) => setLanguage(e.target.value), className: "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white", children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "hi", children: "Hindi" }), _jsx("option", { value: "es", children: "Spanish" }), _jsx("option", { value: "fr", children: "French" }), _jsx("option", { value: "de", children: "German" })] })] })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "checkbox", id: "cloudLLM", checked: cloudLLM, onChange: (e) => setCloudLLM(e.target.checked), className: "w-4 h-4 rounded border-slate-700 bg-slate-800" }), _jsx("label", { htmlFor: "cloudLLM", className: "text-sm", children: "Use Cloud LLM (requires consent - faster, but data sent to external API)" })] }), _jsx("button", { onClick: handleEdit, disabled: processing, className: "w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: processing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), "Processing..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileText, { className: "h-5 w-5" }), "Process Document"] })) })] })), result && (_jsxs("div", { className: "border border-slate-800 rounded-lg p-6 bg-slate-900/50 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Results" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { onClick: () => setShowPreview(!showPreview), className: "px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2", children: [_jsx(Eye, { className: "h-4 w-4" }), showPreview ? 'Hide' : 'Show', " Preview"] }), _jsxs("button", { onClick: handleDownload, className: "px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), "Download"] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-slate-400", children: "Confidence:" }), (() => {
                                            const Icon = confidenceIcons[result.confidence];
                                            return (_jsxs("div", { className: `flex items-center gap-1 ${confidenceColors[result.confidence]}`, children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium capitalize", children: result.confidence })] }));
                                        })()] }), result.metadata && (_jsxs("div", { className: "text-sm text-slate-400 space-y-1", children: [result.metadata.model && _jsxs("p", { children: ["Model: ", result.metadata.model] }), result.metadata.processingTime && (_jsxs("p", { children: ["Processing Time: ", (result.metadata.processingTime / 1000).toFixed(1), "s"] })), result.metadata.wordCount && _jsxs("p", { children: ["Word Count: ", result.metadata.wordCount] })] })), _jsxs("div", { children: [_jsxs("p", { className: "text-sm text-slate-400 mb-2", children: ["Changes: ", result.changes.length, " modification(s)"] }), showPreview && result.changes.length > 0 && (_jsxs("div", { className: "mt-4 space-y-2 max-h-96 overflow-auto", children: [result.changes.slice(0, 10).map((change, idx) => (_jsxs("div", { className: "p-3 bg-slate-800 rounded-lg text-sm space-y-1", children: [change.original && (_jsxs("div", { children: [_jsx("span", { className: "text-red-400", children: "- " }), _jsx("span", { className: "text-slate-300 line-through", children: change.original })] })), change.edited && (_jsxs("div", { children: [_jsx("span", { className: "text-green-400", children: "+ " }), _jsx("span", { className: "text-slate-200", children: change.edited })] }))] }, idx))), result.changes.length > 10 && (_jsxs("p", { className: "text-xs text-slate-500 text-center", children: ["... and ", result.changes.length - 10, " more changes"] }))] }))] })] }))] }) }), _jsx(ConsentModal, { isOpen: showConsentModal, onAccept: handleConsentAccept, onReject: handleConsentReject, fileName: file?.name || 'document' })] }));
}
