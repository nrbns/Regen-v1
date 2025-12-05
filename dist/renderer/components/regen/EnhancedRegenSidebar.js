import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Enhanced Regen Sidebar - Feature #2
 * AI Chat + Notes + Saved Research + Quick Tools + Clipboard + Downloads
 */
import { useState, useEffect } from 'react';
import { Send, Sparkles, Loader2, X, Search, FileText, Clipboard, Download, Folder, Wrench, BookOpen, Copy, } from 'lucide-react';
import { toast } from '../../utils/toast';
export function EnhancedRegenSidebar() {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading] = useState(false);
    // Notes state
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    // Research state
    const [savedResearch, setSavedResearch] = useState([]);
    // Clipboard state
    const [clipboardItems, setClipboardItems] = useState([]);
    // Downloads state
    const [downloads] = useState([]);
    // Files state (currently unused)
    // const [files] = useState<string[]>([]);
    // Load saved data
    useEffect(() => {
        // Load notes from localStorage
        const savedNotes = localStorage.getItem('regen-notes');
        if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
        }
        // Load research
        const savedResearchData = localStorage.getItem('regen-research');
        if (savedResearchData) {
            setSavedResearch(JSON.parse(savedResearchData));
        }
        // Load clipboard history
        const savedClipboard = localStorage.getItem('regen-clipboard');
        if (savedClipboard) {
            setClipboardItems(JSON.parse(savedClipboard));
        }
        // Monitor clipboard
        const handleClipboardChange = () => {
            navigator.clipboard
                .readText()
                .then(text => {
                if (text && text.length > 0) {
                    const newItem = {
                        id: `clip-${Date.now()}`,
                        text,
                        timestamp: Date.now(),
                        type: text.startsWith('http')
                            ? 'url'
                            : text.includes('function') || text.includes('const')
                                ? 'code'
                                : 'text',
                    };
                    setClipboardItems(prev => {
                        const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
                        localStorage.setItem('regen-clipboard', JSON.stringify(updated));
                        return updated;
                    });
                }
            })
                .catch(() => { });
        };
        // Check clipboard every 2 seconds
        const clipboardInterval = setInterval(handleClipboardChange, 2000);
        return () => clearInterval(clipboardInterval);
    }, []);
    // Save notes
    const saveNote = () => {
        if (!noteTitle.trim() && !noteContent.trim())
            return;
        const note = selectedNote || {
            id: `note-${Date.now()}`,
            title: noteTitle || 'Untitled',
            content: noteContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        if (selectedNote) {
            note.title = noteTitle || note.title;
            note.content = noteContent;
            note.updatedAt = Date.now();
        }
        const updated = selectedNote ? notes.map(n => (n.id === note.id ? note : n)) : [note, ...notes];
        setNotes(updated);
        localStorage.setItem('regen-notes', JSON.stringify(updated));
        setSelectedNote(null);
        setNoteTitle('');
        setNoteContent('');
        toast.success('Note saved');
    };
    const _deleteNote = (id) => {
        const updated = notes.filter(n => n.id !== id);
        setNotes(updated);
        localStorage.setItem('regen-notes', JSON.stringify(updated));
        if (selectedNote?.id === id) {
            setSelectedNote(null);
            setNoteTitle('');
            setNoteContent('');
        }
    };
    const copyToClipboard = async (text) => {
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900 border-l border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5 text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-gray-200", children: "Regen" })] }), _jsx("button", { onClick: async () => {
                            const { useAppStore } = await import('../../state/appStore');
                            useAppStore.getState().setRegenSidebarOpen(false);
                        }, className: "text-gray-400 hover:text-gray-300 transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "flex gap-1 p-2 border-b border-gray-700 overflow-x-auto", children: [
                    { id: 'chat', icon: Sparkles, label: 'Chat' },
                    { id: 'notes', icon: FileText, label: 'Notes' },
                    { id: 'research', icon: BookOpen, label: 'Research' },
                    { id: 'tools', icon: Wrench, label: 'Tools' },
                    { id: 'clipboard', icon: Clipboard, label: 'Clipboard' },
                    { id: 'downloads', icon: Download, label: 'Downloads' },
                    { id: 'files', icon: Folder, label: 'Files' },
                ].map(tab => {
                    const Icon = tab.icon;
                    return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`, children: [_jsx(Icon, { className: "w-4 h-4" }), _jsx("span", { className: "hidden md:inline", children: tab.label })] }, tab.id));
                }) }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [activeTab === 'chat' && (_jsxs("div", { className: "p-4 space-y-4", children: [messages.length === 0 && (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(Sparkles, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "Ask me anything" })] })), messages.map(msg => (_jsx("div", { className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsx("div", { className: `max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`, children: _jsx("p", { className: "text-sm whitespace-pre-wrap", children: msg.content }) }) }, msg.id))), isLoading && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "bg-gray-800 rounded-lg px-4 py-2", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-gray-400" }) }) }))] })), activeTab === 'notes' && (_jsxs("div", { className: "flex flex-col h-full", children: [_jsx("div", { className: "flex-1 overflow-y-auto p-4", children: notes.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(FileText, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No notes yet" })] })) : (_jsx("div", { className: "space-y-2", children: notes.map(note => (_jsxs("div", { onClick: () => {
                                            setSelectedNote(note);
                                            setNoteTitle(note.title);
                                            setNoteContent(note.content);
                                        }, className: "p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors", children: [_jsx("h3", { className: "font-semibold text-white mb-1", children: note.title }), _jsx("p", { className: "text-sm text-gray-400 line-clamp-2", children: note.content }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: new Date(note.updatedAt).toLocaleDateString() })] }, note.id))) })) }), _jsxs("div", { className: "p-4 border-t border-gray-700 space-y-2", children: [_jsx("input", { type: "text", value: noteTitle, onChange: e => setNoteTitle(e.target.value), placeholder: "Note title...", className: "w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm" }), _jsx("textarea", { value: noteContent, onChange: e => setNoteContent(e.target.value), placeholder: "Write your note...", className: "w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm min-h-[100px]" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: saveNote, className: "flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm", children: [selectedNote ? 'Update' : 'Save', " Note"] }), selectedNote && (_jsx("button", { onClick: () => {
                                                    setSelectedNote(null);
                                                    setNoteTitle('');
                                                    setNoteContent('');
                                                }, className: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm", children: "Cancel" }))] })] })] })), activeTab === 'research' && (_jsx("div", { className: "p-4", children: savedResearch.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(BookOpen, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No saved research yet" })] })) : (_jsx("div", { className: "space-y-3", children: savedResearch.map(research => (_jsxs("div", { className: "p-4 bg-gray-800 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-white mb-2", children: research.query }), _jsx("p", { className: "text-sm text-gray-300 mb-2", children: research.summary }), _jsx("div", { className: "flex flex-wrap gap-2", children: research.sources.map((src, i) => (_jsxs("a", { href: src, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-400 hover:underline", children: ["Source ", i + 1] }, i))) })] }, research.id))) })) })), activeTab === 'clipboard' && (_jsx("div", { className: "p-4", children: clipboardItems.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(Clipboard, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "Clipboard history will appear here" })] })) : (_jsx("div", { className: "space-y-2", children: clipboardItems.map(item => (_jsxs("div", { className: "p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("p", { className: "text-sm text-gray-300 flex-1 line-clamp-3", children: item.text }), _jsx("button", { onClick: () => copyToClipboard(item.text), className: "text-gray-400 hover:text-white transition-colors", children: _jsx(Copy, { className: "w-4 h-4" }) })] }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: new Date(item.timestamp).toLocaleTimeString() })] }, item.id))) })) })), activeTab === 'downloads' && (_jsx("div", { className: "p-4", children: downloads.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(Download, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No downloads yet" })] })) : (_jsx("div", { className: "space-y-2", children: downloads.map(download => (_jsxs("div", { className: "p-3 bg-gray-800 rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-sm text-white", children: download.filename }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${download.status === 'completed'
                                                    ? 'bg-green-600'
                                                    : download.status === 'failed'
                                                        ? 'bg-red-600'
                                                        : 'bg-blue-600'}`, children: download.status })] }), download.status === 'downloading' && (_jsx("div", { className: "w-full bg-gray-700 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all", style: { width: `${download.progress}%` } }) }))] }, download.id))) })) })), activeTab === 'tools' && (_jsxs("div", { className: "p-4 space-y-3", children: [_jsx(QuickToolButton, { icon: Search, label: "Quick Search", onClick: () => {
                                    setActiveTab('chat');
                                    setInput('/search ');
                                } }), _jsx(QuickToolButton, { icon: FileText, label: "New Note", onClick: () => {
                                    setActiveTab('notes');
                                    setNoteTitle('');
                                    setNoteContent('');
                                } }), _jsx(QuickToolButton, { icon: Clipboard, label: "Paste Latest", onClick: async () => {
                                    const text = await navigator.clipboard.readText();
                                    if (text) {
                                        setActiveTab('chat');
                                        setInput(text);
                                    }
                                } })] })), activeTab === 'files' && (_jsx("div", { className: "p-4", children: _jsx("p", { className: "text-sm text-gray-400", children: "File explorer coming soon" }) }))] }), activeTab === 'chat' && (_jsx("div", { className: "p-4 border-t border-gray-700", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: input, onChange: e => setInput(e.target.value), onKeyPress: e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    // Handle send
                                }
                            }, placeholder: "Ask Regen anything...", className: "flex-1 bg-gray-800 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" }), _jsx("button", { className: "p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700", children: _jsx(Send, { className: "w-5 h-5" }) })] }) }))] }));
}
function QuickToolButton({ icon: Icon, label, onClick, }) {
    return (_jsxs("button", { onClick: onClick, className: "w-full flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors", children: [_jsx(Icon, { className: "w-5 h-5 text-purple-400" }), _jsx("span", { className: "text-sm text-white", children: label })] }));
}
