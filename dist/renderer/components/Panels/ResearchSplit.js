import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ResearchSplit - Reader + Notes split pane for Research mode
 */
// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, BookOpen, PenLine, FileDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../common/Skeleton';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { debounce } from 'lodash-es';
import { ipcEvents } from '../../lib/ipc-events';
import { trackHighlight, trackNote } from '../../core/supermemory/tracker';
export function ResearchSplit() {
    const { activeId } = useTabsStore();
    const [readerContent, setReaderContent] = useState('');
    const [notes, setNotes] = useState('');
    const [highlights, setHighlights] = useState([]);
    const [currentUrl, setCurrentUrl] = useState('');
    const [exporting, setExporting] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const readerRef = useRef(null);
    // Load content for current tab
    useEffect(() => {
        const loadContent = async () => {
            if (!activeId) {
                setReaderContent('');
                setCurrentUrl('');
                setNotes('');
                setHighlights([]);
                return;
            }
            try {
                const tabs = await ipc.tabs.list();
                const tab = tabs.find((t) => t.id === activeId);
                if (!tab?.url) {
                    setReaderContent('');
                    setCurrentUrl('');
                    return;
                }
                const url = tab.url;
                setCurrentUrl(url);
                // Skip special pages
                if (url.startsWith('about:') || url.startsWith('chrome:')) {
                    setReaderContent('');
                    setNotes('');
                    setHighlights([]);
                    return;
                }
                // Load saved notes for this URL
                try {
                    const saved = (await ipc.research.getNotes(url));
                    if (saved) {
                        setNotes(saved.notes || '');
                        if (Array.isArray(saved.highlights)) {
                            const mapped = saved.highlights.map((h) => ({
                                id: h.id || (crypto.randomUUID?.() ?? `hl-${Date.now()}`),
                                text: h.text || '',
                                color: h.color || '#facc15',
                                createdAt: h.createdAt || Date.now(),
                                note: h.note,
                            }));
                            setHighlights(mapped);
                        }
                        else {
                            setHighlights([]);
                        }
                    }
                }
                catch (error) {
                    console.error('Failed to load notes:', error);
                }
                // Extract readable content - wait a bit for page to load
                setExtracting(true);
                setReaderContent(''); // Clear previous content while extracting
                // Wait a short delay to allow page to load (especially for navigation)
                await new Promise(resolve => setTimeout(resolve, 500));
                try {
                    // Try extraction with fallback to HTTP API
                    const { extractContent } = await import('../../lib/extract-content');
                    const result = await extractContent(activeId);
                    if (import.meta.env.DEV) {
                        console.log('[ResearchSplit] Extract result:', {
                            hasHtml: !!result?.html,
                            hasContent: !!result?.content,
                            title: result?.title,
                            url
                        });
                    }
                    if (result?.html) {
                        // Use the extracted HTML content
                        setReaderContent(result.html);
                    }
                    else if (result?.content) {
                        // Fallback: show plain text formatted nicely
                        const formattedContent = result.content
                            .split('\n\n')
                            .filter(p => p.trim().length > 0)
                            .map(p => `<p>${p.trim()}</p>`)
                            .join('');
                        setReaderContent(`<div class="prose prose-invert max-w-none"><h1>${result.title || url}</h1>${formattedContent}</div>`);
                    }
                    else {
                        // No content extracted - this is normal for:
                        // - Pages that block iframe embedding (CSP/X-Frame-Options)
                        // - Pages that haven't loaded yet
                        // - Search engine results pages
                        setReaderContent('');
                        if (import.meta.env.DEV && url && !url.includes('duckduckgo.com') && !url.includes('google.com')) {
                            console.log('[ResearchSplit] No content extracted for URL:', url, '- This may be normal for pages that block embedding');
                        }
                    }
                }
                catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('[ResearchSplit] Failed to extract content:', error);
                    }
                    setReaderContent('');
                }
                finally {
                    setExtracting(false);
                }
            }
            catch (error) {
                console.error('Failed to load research content:', error);
                setReaderContent('');
            }
        };
        loadContent();
        // Listen for tab updates
        const handleTabUpdate = () => {
            loadContent();
        };
        if (window.ipc?.on) {
            window.ipc.on('tabs:updated', handleTabUpdate);
            return () => {
                if (window.ipc?.removeListener) {
                    window.ipc.removeListener('tabs:updated', handleTabUpdate);
                }
            };
        }
    }, [activeId]);
    // Auto-save notes (debounced)
    const saveNotes = useRef(debounce(async (url, notesText, highlightsData) => {
        if (!url || url.startsWith('about:') || url.startsWith('chrome:'))
            return;
        try {
            await ipc.research.saveNotes(url, notesText, highlightsData);
            console.log('Auto-saved notes for', url);
            // Track note in SuperMemory
            if (notesText.trim().length > 0) {
                try {
                    await trackNote(url, {
                        title: notesText.substring(0, 100), // First 100 chars as title
                        noteLength: notesText.length,
                    });
                }
                catch (error) {
                    console.warn('[ResearchSplit] Failed to track note:', error);
                }
            }
        }
        catch (error) {
            console.error('Failed to save notes:', error);
        }
    }, 1000)).current;
    useEffect(() => {
        if (currentUrl && (notes || highlights.length > 0)) {
            saveNotes(currentUrl, notes, highlights);
        }
    }, [notes, highlights, currentUrl, saveNotes]);
    useEffect(() => {
        const unsubscribe = ipcEvents.on('research:highlight-added', async (payload) => {
            if (!payload?.url || payload.url !== currentUrl)
                return;
            const newHighlight = {
                id: payload.highlight.id,
                text: payload.highlight.text,
                color: payload.highlight.color || '#facc15',
                createdAt: payload.highlight.createdAt || Date.now(),
                note: payload.highlight.note,
            };
            setHighlights((prev) => [...prev, newHighlight]);
            // Track highlight in SuperMemory
            try {
                await trackHighlight(currentUrl, payload.highlight.text, {
                    title: payload.highlight.note,
                    context: payload.highlight.text,
                });
            }
            catch (error) {
                console.warn('[ResearchSplit] Failed to track highlight:', error);
            }
        });
        return unsubscribe;
    }, [currentUrl]);
    const _handleHighlightNoteChange = (id, nextNote) => {
        setHighlights((prev) => prev.map((highlight) => highlight.id === id
            ? {
                ...highlight,
                note: nextNote,
            }
            : highlight));
    };
    const _sortedHighlights = useMemo(() => [...highlights].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [highlights]);
    const handleLaunchFlow = async () => {
        if (!activeId)
            return;
        setExtracting(true);
        setReaderContent('');
        try {
            // Get tab context
            const context = await ipc.tabs.getContext(activeId);
            if (context.success && context.context) {
                const query = context.context.title || context.context.url || 'Extract and summarize this page';
                // Launch workflow
                const result = await ipc.workflow.launch(query);
                if (result.success) {
                    // Trigger content extraction
                    const extractResult = await ipc.research.extractContent(activeId);
                    if (extractResult?.html) {
                        setReaderContent(extractResult.html);
                    }
                    else if (extractResult?.content) {
                        const formattedContent = extractResult.content
                            .split('\n\n')
                            .filter(p => p.trim().length > 0)
                            .map(p => `<p>${p.trim()}</p>`)
                            .join('');
                        setReaderContent(`<div class="prose prose-invert max-w-none"><h1>${extractResult.title || currentUrl}</h1>${formattedContent}</div>`);
                    }
                }
            }
            else {
                // Fallback: just extract content
                const extractResult = await ipc.research.extractContent(activeId);
                if (extractResult?.html) {
                    setReaderContent(extractResult.html);
                }
                else if (extractResult?.content) {
                    const formattedContent = extractResult.content
                        .split('\n\n')
                        .filter(p => p.trim().length > 0)
                        .map(p => `<p>${p.trim()}</p>`)
                        .join('');
                    setReaderContent(`<div class="prose prose-invert max-w-none"><h1>${extractResult.title || currentUrl}</h1>${formattedContent}</div>`);
                }
            }
        }
        catch (error) {
            console.error('Launch Flow failed:', error);
            // Fallback: just extract content
            try {
                const extractResult = await ipc.research.extractContent(activeId);
                if (extractResult?.html) {
                    setReaderContent(extractResult.html);
                }
                else if (extractResult?.content) {
                    const formattedContent = extractResult.content
                        .split('\n\n')
                        .filter(p => p.trim().length > 0)
                        .map(p => `<p>${p.trim()}</p>`)
                        .join('');
                    setReaderContent(`<div class="prose prose-invert max-w-none"><h1>${extractResult.title || currentUrl}</h1>${formattedContent}</div>`);
                }
            }
            catch (extractError) {
                console.error('Content extraction also failed:', extractError);
            }
        }
        finally {
            setExtracting(false);
        }
    };
    const handleExport = async (format) => {
        if (!currentUrl || currentUrl.startsWith('about:') || currentUrl.startsWith('chrome:')) {
            return;
        }
        const maybeFlush = saveNotes?.flush;
        if (typeof maybeFlush === 'function') {
            maybeFlush();
        }
        try {
            await ipc.research.saveNotes(currentUrl, notes, highlights);
        }
        catch (error) {
            console.error('Failed to sync notes before export:', error);
        }
        setExporting(format);
        try {
            const result = await ipc.research.export(format, [currentUrl], true);
            if (result?.format === 'markdown' && result?.path) {
                alert(`Markdown exported to ${result.path}`);
            }
            else if (result?.format === 'obsidian' && result?.folder) {
                alert(`Obsidian vault files saved to ${result.folder}`);
            }
            else if (result?.format === 'notion' && Array.isArray(result?.notionPages)) {
                const pages = result.notionPages
                    .map((page) => (page?.url ? `• ${page.title || 'Untitled'}\n  ${page.url}` : `• ${page.title || 'Untitled'}`))
                    .join('\n');
                alert(`Synced to Notion:\n${pages}`);
            }
            else {
                alert('Export completed.');
            }
        }
        catch (error) {
            console.error('Failed to export:', error);
            const message = error instanceof Error ? error.message : 'Failed to export';
            alert(message);
        }
        finally {
            setExporting(null);
        }
    };
    return (_jsxs("div", { className: "h-full flex", children: [_jsxs("div", { className: "flex-1 flex flex-col border-r border-gray-700/30 bg-gray-950 overflow-hidden", children: [_jsx("div", { className: "flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/50", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BookOpen, { size: 16, className: "text-blue-400" }), _jsx("span", { className: "text-sm font-medium text-gray-300", children: "Reader" })] }) }), _jsx("div", { ref: readerRef, className: "flex-1 overflow-y-auto p-6 prose prose-invert max-w-none", style: {
                            color: '#e5e7eb',
                        }, children: _jsx(AnimatePresence, { mode: "wait", children: extracting ? (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3 text-gray-400", children: [_jsx(Loader2, { size: 20, className: "animate-spin text-blue-400" }), _jsx("span", { className: "text-sm", children: "Extracting readable content..." })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Skeleton, { variant: "text", width: "100%", height: 24 }), _jsx(Skeleton, { variant: "text", width: "90%", height: 16 }), _jsx(Skeleton, { variant: "text", width: "95%", height: 16 }), _jsx(Skeleton, { variant: "text", width: "85%", height: 16 }), _jsx(Skeleton, { variant: "text", width: "100%", height: 16 }), _jsx(Skeleton, { variant: "text", width: "88%", height: 16 })] })] }, "loading")) : readerContent ? (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, className: "text-sm leading-relaxed", dangerouslySetInnerHTML: { __html: readerContent } }, "content")) : (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "text-center text-gray-500 py-12 px-4", children: [_jsx(FileText, { size: 48, className: "mx-auto mb-4 opacity-50" }), _jsx("p", { className: "mb-2", children: "No readable content available" }), _jsx("p", { className: "text-xs mb-4", children: "Navigate to a page to extract content" }), activeId && currentUrl && !currentUrl.startsWith('about:') && !currentUrl.startsWith('chrome:') && (_jsx("button", { type: "button", onClick: handleLaunchFlow, disabled: extracting, className: "inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:border-blue-400/60 hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: extracting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), "Extracting..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileText, { size: 16 }), "Launch Flow"] })) }))] }, "empty")) }) })] }), _jsxs("div", { className: "w-80 flex flex-col border-l border-gray-700/30 bg-gray-900/50 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-gray-800/50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(PenLine, { size: 16, className: "text-purple-400" }), _jsx("span", { className: "text-sm font-medium text-gray-300", children: "Notes" })] }), _jsx("div", { className: "flex items-center gap-1", children: _jsx("button", { onClick: () => handleExport('markdown'), disabled: !currentUrl || exporting === 'markdown', className: "p-1.5 rounded hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", title: "Export as Markdown", children: _jsx(FileDown, { size: 14, className: "text-gray-400" }) }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("textarea", { value: notes, onChange: (e) => {
                                setNotes(e.target.value);
                                if (currentUrl) {
                                    saveNotes(currentUrl, e.target.value, highlights);
                                }
                            }, placeholder: "Add your notes here...", className: "w-full h-full bg-transparent text-sm text-gray-300 placeholder-gray-500 resize-none border-none outline-none" }) })] })] }));
}
