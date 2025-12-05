import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Citation Manager UI - Track and export citations
 */
import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { CitationTracker } from '../../core/citations/CitationTracker';
import { SessionWorkspace } from '../../core/workspace/SessionWorkspace';
import { toast } from '../../utils/toast';
export function CitationManager({ sessionId }) {
    const [citations, setCitations] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState('apa');
    useEffect(() => {
        loadCitations();
    }, [sessionId]);
    const loadCitations = () => {
        const loaded = CitationTracker.getCitations(sessionId);
        setCitations(loaded);
    };
    const addCitation = async () => {
        const url = prompt('URL:');
        if (!url)
            return;
        const title = prompt('Title:') || 'Untitled';
        const author = prompt('Author (optional):') || undefined;
        const date = prompt('Date (optional):') || undefined;
        try {
            const citation = CitationTracker.addCitation(sessionId, {
                url,
                title,
                author,
                date,
                type: 'web',
                metadata: {
                    domain: new URL(url).hostname,
                },
            });
            // Calculate credibility
            const credibility = await CitationTracker.calculateCredibility(citation);
            citation.credibility = {
                score: credibility,
                factors: [],
            };
            loadCitations();
            toast.success('Citation added');
        }
        catch {
            toast.error('Failed to add citation');
        }
    };
    const deleteCitation = (citationId) => {
        if (!confirm('Delete this citation?'))
            return;
        const session = SessionWorkspace.getSession(sessionId);
        if (!session)
            return;
        if (session.metadata.sources) {
            const sources = session.metadata.sources;
            session.metadata.sources = sources.filter(c => c.id !== citationId);
            SessionWorkspace.saveSession(session);
            loadCitations();
            toast.success('Citation deleted');
        }
    };
    const exportCitations = (format) => {
        if (citations.length === 0) {
            toast.error('No citations to export');
            return;
        }
        let content = '';
        let filename = '';
        let mimeType = '';
        if (format === 'bibtex') {
            content = CitationTracker.exportToBibTeX(citations);
            filename = 'citations.bib';
            mimeType = 'text/plain';
        }
        else if (format === 'json') {
            content = CitationTracker.exportToJSON(citations);
            filename = 'citations.json';
            mimeType = 'application/json';
        }
        else {
            // Formatted (selected format)
            content = citations
                .map((cite, index) => `${index + 1}. ${CitationTracker.generateCitation(cite, selectedFormat)}`)
                .join('\n\n');
            filename = `citations_${selectedFormat}.txt`;
            mimeType = 'text/plain';
        }
        // Download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Citations exported');
    };
    const getCredibilityColor = (score) => {
        if (score >= 80)
            return 'text-green-400';
        if (score >= 60)
            return 'text-yellow-400';
        return 'text-red-400';
    };
    const getCredibilityIcon = (score) => {
        if (score >= 80)
            return _jsx(CheckCircle, { className: "w-4 h-4" });
        return _jsx(AlertCircle, { className: "w-4 h-4" });
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900", children: [_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [_jsx(FileText, { className: "w-5 h-5" }), "Citations (", citations.length, ")"] }), _jsx("button", { onClick: addCitation, className: "p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg", children: _jsx(Plus, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: selectedFormat, onChange: e => setSelectedFormat(e.target.value), className: "bg-gray-800 text-white text-sm rounded px-3 py-1", children: [_jsx("option", { value: "apa", children: "APA" }), _jsx("option", { value: "mla", children: "MLA" }), _jsx("option", { value: "chicago", children: "Chicago" }), _jsx("option", { value: "ieee", children: "IEEE" })] }), _jsxs("button", { onClick: () => exportCitations('formatted'), className: "px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm", children: ["Export ", selectedFormat.toUpperCase()] }), _jsx("button", { onClick: () => exportCitations('bibtex'), className: "px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm", children: "BibTeX" }), _jsx("button", { onClick: () => exportCitations('json'), className: "px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm", children: "JSON" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: citations.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(FileText, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No citations yet" }), _jsx("p", { className: "text-xs mt-2", children: "Add citations to track sources" })] })) : (_jsx("div", { className: "space-y-3", children: citations.map(citation => (_jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "text-sm font-semibold text-white", children: citation.title }), citation.credibility && (_jsxs("div", { className: `flex items-center gap-1 ${getCredibilityColor(citation.credibility.score)}`, children: [getCredibilityIcon(citation.credibility.score), _jsxs("span", { className: "text-xs", children: [citation.credibility.score, "/100"] })] }))] }), _jsx("a", { href: citation.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-400 hover:underline block mb-2", children: citation.url }), citation.author && (_jsxs("p", { className: "text-xs text-gray-400", children: ["Author: ", citation.author] })), citation.date && (_jsxs("p", { className: "text-xs text-gray-400", children: ["Date: ", citation.date] }))] }), _jsx("button", { onClick: () => deleteCitation(citation.id), className: "p-1 text-red-400 hover:text-red-300", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "mt-3 p-3 bg-gray-900 rounded border border-gray-700", children: [_jsxs("p", { className: "text-xs text-gray-400 mb-1", children: [selectedFormat.toUpperCase(), " Format:"] }), _jsx("p", { className: "text-xs text-gray-300 font-mono", children: CitationTracker.generateCitation(citation, selectedFormat) })] })] }, citation.id))) })) })] }));
}
