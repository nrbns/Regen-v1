import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PDF Upload Component
 * Drag & drop PDF upload with auto-research
 */
import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
export function PDFUpload() {
    const [state, setState] = useState({
        uploading: false,
        uploaded: false,
        result: null,
        error: null,
    });
    const fileInputRef = useRef(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    const handleFileSelect = async (file) => {
        if (!file.type.includes('pdf')) {
            setState(prev => ({
                ...prev,
                error: 'Please upload a PDF file',
            }));
            return;
        }
        setState(prev => ({
            ...prev,
            uploading: true,
            error: null,
        }));
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('autoResearch', 'true');
            const response = await fetch(`${API_BASE}/api/pdf/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            const result = await response.json();
            setState(prev => ({
                ...prev,
                uploading: false,
                uploaded: true,
                result,
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                uploading: false,
                error: error.message || 'Upload failed',
            }));
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
    };
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { onDrop: handleDrop, onDragOver: handleDragOver, className: `flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${state.uploading
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'}`, onClick: () => fileInputRef.current?.click(), children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf", className: "hidden", onChange: (e) => {
                            const file = e.target.files?.[0];
                            if (file)
                                handleFileSelect(file);
                        } }), state.uploading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-12 w-12 animate-spin text-indigo-500" }), _jsx("div", { className: "mt-4 text-lg font-semibold text-indigo-700", children: "Uploading & Processing..." }), _jsx("div", { className: "mt-2 text-sm text-gray-600", children: "Regen is reading the entire paper right now" })] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "h-12 w-12 text-gray-400" }), _jsx("div", { className: "mt-4 text-lg font-semibold text-gray-700", children: "Drop PDF here or click to upload" }), _jsx("div", { className: "mt-2 text-sm text-gray-500", children: "PDF will be automatically analyzed and researched" })] }))] }), state.uploaded && state.result && (_jsxs("div", { className: "rounded-lg border border-green-200 bg-green-50 p-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-green-800", children: [_jsx(FileText, { size: 20 }), _jsx("span", { className: "font-semibold", children: "PDF Processed Successfully!" })] }), _jsxs("div", { className: "mt-2 text-sm text-green-700", children: [_jsxs("div", { children: ["Title: ", state.result.title] }), _jsxs("div", { children: ["Pages: ", state.result.pages] }), _jsxs("div", { children: ["Text Length: ", state.result.extracted_text_length, " characters"] }), state.result.research_status === 'completed' && (_jsx("div", { className: "mt-2 font-medium", children: "\u2705 Research completed! Check the research panel." }))] })] })), state.error && (_jsxs("div", { className: "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700", children: ["Error: ", state.error] }))] }));
}
