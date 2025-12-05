import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Document Viewer - Overlay for viewing full documents with highlighted snippets
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, BookOpen } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
export function DocumentViewer({ isOpen, onClose, document, highlightText }) {
    const contentRef = useRef(null);
    useEffect(() => {
        if (isOpen && highlightText && contentRef.current) {
            // Scroll to and highlight the text
            const content = contentRef.current;
            const text = highlightText.toLowerCase();
            // Simple text highlighting approach
            if (content.textContent?.toLowerCase().includes(text)) {
                // Find and highlight the text
                const walker = window.document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
                let node;
                while ((node = walker.nextNode())) {
                    if (node.textContent?.toLowerCase().includes(text)) {
                        const parent = node.parentElement;
                        if (parent && parent.textContent) {
                            // Replace text with highlighted version
                            const highlighted = parent.innerHTML.replace(new RegExp(highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), `<span class="bg-yellow-400/30 text-yellow-200 rounded px-1">$&</span>`);
                            parent.innerHTML = highlighted;
                            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            break;
                        }
                    }
                }
            }
        }
    }, [isOpen, highlightText]);
    const handleOpenInTab = async () => {
        if (document.url) {
            try {
                await ipc.tabs.create(document.url);
            }
            catch (error) {
                console.error('Failed to open in tab:', error);
            }
        }
    };
    if (!isOpen)
        return null;
    return (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4", onClick: onClose, children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 }, className: "w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsx("div", { className: "p-2 rounded-lg bg-blue-500/20 text-blue-400", children: document.type === 'pdf' ? (_jsx(FileText, { size: 20 })) : (_jsx(BookOpen, { size: 20 })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-100 truncate", children: document.title }), document.url && (_jsx("p", { className: "text-xs text-gray-400 truncate mt-1", children: document.url }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [document.url && (_jsx("button", { onClick: handleOpenInTab, className: "p-2 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors", title: "Open in new tab", children: _jsx(ExternalLink, { size: 18 }) })), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors", children: _jsx(X, { size: 18 }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: document.content ? (_jsx("div", { ref: contentRef, className: "prose prose-invert max-w-none text-gray-200 leading-relaxed", dangerouslySetInnerHTML: { __html: document.content } })) : document.snippet ? (_jsxs("div", { className: "text-gray-200 leading-relaxed", children: [_jsx("p", { className: "text-lg mb-4", children: document.snippet }), _jsx("p", { className: "text-sm text-gray-400", children: "Full document content not available. Click \"Open in new tab\" to view the complete document." })] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-gray-400", children: [_jsx(FileText, { size: 48, className: "opacity-50 mb-4" }), _jsx("p", { children: "No content available for this document." })] })) }), _jsx("div", { className: "p-4 border-t border-slate-800 bg-slate-900/50", children: _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsx("span", { className: "px-2 py-1 rounded bg-slate-800 uppercase", children: document.type }), highlightText && (_jsxs("span", { className: "text-yellow-400", children: ["Highlighted: \"", highlightText.slice(0, 50), "...\""] }))] }) })] }) }) }));
}
