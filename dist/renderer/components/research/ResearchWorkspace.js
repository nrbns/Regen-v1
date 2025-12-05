import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Research Workspace UI - Real-time session management
 */
import { useState, useEffect } from 'react';
import { Save, FolderOpen, FileText, Download, Trash2, Plus, Search, BookOpen, Highlighter, Sparkles, } from 'lucide-react';
import { SessionWorkspace } from '../../core/workspace/SessionWorkspace';
import { toast } from '../../utils/toast';
import { AgentSuggestions } from './AgentSuggestions';
import { StreamingAgentSidebar } from './StreamingAgentSidebar';
import { HighlightToNote } from '../../core/content/highlightToNote';
import { UniversalSearchUI } from '../search/UniversalSearchUI';
export function ResearchWorkspace() {
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        loadSessions();
        const current = SessionWorkspace.getCurrentSession();
        if (current)
            setCurrentSession(current);
        // Enable highlight → note workflow
        HighlightToNote.enable();
        return () => {
            HighlightToNote.disable();
        };
    }, []);
    const loadSessions = () => {
        const all = SessionWorkspace.getAllSessions();
        setSessions(all);
    };
    const createSession = () => {
        const title = prompt('Session title:') || 'Untitled Session';
        const query = prompt('Research query (optional):') || undefined;
        const session = SessionWorkspace.createSession(title, query);
        setCurrentSession(session);
        loadSessions();
        toast.success('Session created');
    };
    const loadSession = (sessionId) => {
        const session = SessionWorkspace.getSession(sessionId);
        if (session) {
            setCurrentSession(session);
            SessionWorkspace['currentSessionId'] = sessionId;
            toast.success('Session loaded');
        }
    };
    const exportSession = async (sessionId) => {
        try {
            await SessionWorkspace.exportSession(sessionId);
            toast.success('Session exported');
        }
        catch {
            toast.error('Export failed');
        }
    };
    const exportToMarkdown = async (sessionId) => {
        try {
            await SessionWorkspace.exportToMarkdown(sessionId);
            toast.success('Exported to Markdown');
        }
        catch {
            toast.error('Export failed');
        }
    };
    const exportToPDF = async (sessionId) => {
        try {
            await SessionWorkspace.exportToPDF(sessionId);
            toast.success('Exported to PDF');
        }
        catch {
            toast.error('PDF export failed');
        }
    };
    const importSession = async () => {
        try {
            const session = await SessionWorkspace.importSession();
            setCurrentSession(session);
            loadSessions();
            toast.success('Session imported');
        }
        catch (error) {
            if (error instanceof Error && error.message !== 'No file selected') {
                toast.error('Import failed');
            }
        }
    };
    const deleteSession = (sessionId) => {
        if (confirm('Delete this session?')) {
            SessionWorkspace.deleteSession(sessionId);
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
            }
            loadSessions();
            toast.success('Session deleted');
        }
    };
    const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.metadata.query?.toLowerCase().includes(searchQuery.toLowerCase()));
    return (_jsxs("div", { className: "flex h-full bg-gray-900", children: [_jsxs("div", { className: "w-80 border-r border-gray-700 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [_jsx(BookOpen, { className: "w-5 h-5" }), "Research Sessions"] }), _jsx("button", { onClick: createSession, className: "p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg", children: _jsx(Plus, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search sessions...", className: "w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-2", children: filteredSessions.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(BookOpen, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No sessions yet" })] })) : (_jsx("div", { className: "space-y-2", children: filteredSessions.map(session => (_jsxs("div", { onClick: () => loadSession(session.id), className: `p-3 rounded-lg cursor-pointer transition-colors ${currentSession?.id === session.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'}`, children: [_jsx("h3", { className: "font-semibold text-sm mb-1", children: session.title }), session.metadata.query && (_jsx("p", { className: "text-xs opacity-75 line-clamp-1", children: session.metadata.query })), _jsxs("div", { className: "flex items-center gap-3 mt-2 text-xs opacity-60", children: [_jsxs("span", { children: [session.tabs.length, " tabs"] }), _jsxs("span", { children: [session.notes.length, " notes"] }), _jsx("span", { children: new Date(session.updatedAt).toLocaleDateString() })] }), _jsxs("div", { className: "flex items-center gap-1 mt-2", children: [_jsx("button", { onClick: e => {
                                                    e.stopPropagation();
                                                    exportSession(session.id);
                                                }, className: "p-1 hover:bg-white/20 rounded", title: "Export", children: _jsx(Download, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => {
                                                    e.stopPropagation();
                                                    exportToMarkdown(session.id);
                                                }, className: "p-1 hover:bg-white/20 rounded", title: "Export to Markdown", children: _jsx(FileText, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => {
                                                    e.stopPropagation();
                                                    exportToPDF(session.id);
                                                }, className: "p-1 hover:bg-white/20 rounded", title: "Export to PDF", children: _jsx(Download, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => {
                                                    e.stopPropagation();
                                                    deleteSession(session.id);
                                                }, className: "p-1 hover:bg-white/20 rounded text-red-400", title: "Delete", children: _jsx(Trash2, { className: "w-3 h-3" }) })] })] }, session.id))) })) }), _jsx("div", { className: "p-4 border-t border-gray-700", children: _jsxs("button", { onClick: importSession, className: "w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg", children: [_jsx(FolderOpen, { className: "w-4 h-4" }), "Import Session"] }) })] }), _jsx(StreamingAgentSidebar, {}), _jsx("div", { className: "flex-1 flex flex-col", children: currentSession ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-4 border-b border-gray-700", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-white", children: currentSession.title }), currentSession.metadata.query && (_jsx("p", { className: "text-sm text-gray-400 mt-1", children: currentSession.metadata.query }))] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("button", { onClick: () => SessionWorkspace.saveSession(currentSession), className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm", children: [_jsx(Save, { className: "w-4 h-4 inline mr-2" }), "Save"] }) })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx(SessionContent, { session: currentSession }) }), _jsx(AgentSuggestions, {})] })) : (_jsx("div", { className: "flex items-center justify-center h-full text-gray-400", children: _jsxs("div", { className: "text-center", children: [_jsx(Sparkles, { className: "w-16 h-16 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-lg mb-2", children: "No session selected" }), _jsx("p", { className: "text-sm", children: "Create a new session or load an existing one" })] }) })) }), _jsx(UniversalSearchUI, {})] }));
}
function SessionContent({ session }) {
    return (_jsxs("div", { className: "space-y-6", children: [session.summaries.length > 0 && (_jsxs("section", { children: [_jsxs("h3", { className: "text-lg font-semibold text-white mb-3 flex items-center gap-2", children: [_jsx(FileText, { className: "w-5 h-5" }), "Summaries (", session.summaries.length, ")"] }), _jsx("div", { className: "space-y-3", children: session.summaries.map(summary => (_jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [_jsx("a", { href: summary.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:underline text-sm font-semibold mb-2 block", children: summary.url }), _jsx("p", { className: "text-gray-300 text-sm mb-2", children: summary.summary }), summary.keywords.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: summary.keywords.map((kw, i) => (_jsx("span", { className: "px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs", children: kw }, i))) }))] }, summary.id))) })] })), session.notes.length > 0 && (_jsxs("section", { children: [_jsxs("h3", { className: "text-lg font-semibold text-white mb-3 flex items-center gap-2", children: [_jsx(FileText, { className: "w-5 h-5" }), "Notes (", session.notes.length, ")"] }), _jsx("div", { className: "space-y-3", children: session.notes.map(note => (_jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [note.url && (_jsx("a", { href: note.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:underline text-xs mb-2 block", children: note.url })), note.selection && (_jsx("blockquote", { className: "border-l-4 border-purple-500 pl-3 py-2 mb-2 text-gray-300 italic text-sm", children: note.selection })), _jsx("p", { className: "text-gray-200 text-sm", children: note.content }), note.tags && note.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: note.tags.map((tag, i) => (_jsx("span", { className: "px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs", children: tag }, i))) }))] }, note.id))) })] })), session.highlights.length > 0 && (_jsxs("section", { children: [_jsxs("h3", { className: "text-lg font-semibold text-white mb-3 flex items-center gap-2", children: [_jsx(Highlighter, { className: "w-5 h-5" }), "Highlights (", session.highlights.length, ")"] }), _jsx("div", { className: "space-y-2", children: session.highlights.map(highlight => (_jsxs("div", { className: "bg-gray-800 rounded-lg p-3", children: [_jsx("blockquote", { className: "border-l-4 border-yellow-500 pl-3 py-1 text-gray-300 italic text-sm", children: highlight.text }), highlight.note && _jsx("p", { className: "text-gray-400 text-xs mt-2", children: highlight.note }), _jsx("a", { href: highlight.url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:underline text-xs mt-2 block", children: highlight.url })] }, highlight.id))) })] })), session.tabs.length > 0 && (_jsxs("section", { children: [_jsxs("h3", { className: "text-lg font-semibold text-white mb-3", children: ["Tabs (", session.tabs.length, ")"] }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: session.tabs.map(tab => (_jsxs("a", { href: tab.url, target: "_blank", rel: "noopener noreferrer", className: "bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: tab.title }), _jsx("p", { className: "text-gray-400 text-xs truncate mt-1", children: tab.url })] }, tab.id))) })] })), session.summaries.length === 0 &&
                session.notes.length === 0 &&
                session.highlights.length === 0 &&
                session.tabs.length === 0 && (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx("p", { className: "text-sm", children: "This session is empty" }), _jsx("p", { className: "text-xs mt-2", children: "Start researching to add content" })] }))] }));
}
