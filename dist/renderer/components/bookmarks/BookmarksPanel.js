import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * BookmarksPanel - Full bookmarks management UI
 */
import { useState } from 'react';
import { Star, Folder, Search, X, ExternalLink, Edit2, Trash2, Plus } from 'lucide-react';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
export function BookmarksPanel() {
    const { bookmarks, folders, removeBookmark, updateBookmark, getBookmarksByFolder, searchBookmarks, addFolder, removeFolder, } = useBookmarksStore();
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showAddFolder, setShowAddFolder] = useState(false);
    const filteredBookmarks = searchQuery
        ? searchBookmarks(searchQuery)
        : selectedFolder
            ? getBookmarksByFolder(selectedFolder)
            : bookmarks;
    const handleOpenBookmark = (url) => {
        ipc.tabs.create(url).catch(console.error);
    };
    const handleEdit = (id) => {
        setEditingId(id);
    };
    const handleSaveEdit = (id, updates) => {
        updateBookmark(id, updates);
        setEditingId(null);
    };
    const handleAddFolder = () => {
        if (newFolderName.trim() && !folders.some(f => f.name === newFolderName.trim())) {
            addFolder(newFolderName.trim());
            setNewFolderName('');
            setShowAddFolder(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-slate-950 text-gray-200", children: [_jsxs("div", { className: "p-4 border-b border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Star, { size: 20, className: "text-yellow-400" }), _jsx("h2", { className: "text-lg font-semibold", children: "Bookmarks" })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search bookmarks...", className: "w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" })] })] }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("div", { className: "w-48 border-r border-gray-800 p-3 overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-xs font-semibold text-gray-400 uppercase", children: "Folders" }), _jsx("button", { onClick: () => setShowAddFolder(true), className: "p-1 hover:bg-gray-800 rounded", title: "Add folder", children: _jsx(Plus, { size: 14 }) })] }), showAddFolder && (_jsxs("div", { className: "mb-2 flex gap-1", children: [_jsx("input", { type: "text", value: newFolderName, onChange: e => setNewFolderName(e.target.value), onKeyDown: e => {
                                            if (e.key === 'Enter')
                                                handleAddFolder();
                                            if (e.key === 'Escape') {
                                                setShowAddFolder(false);
                                                setNewFolderName('');
                                            }
                                        }, placeholder: "Folder name", className: "flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs focus:outline-none", autoFocus: true }), _jsx("button", { onClick: handleAddFolder, className: "px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs", children: "Add" })] })), _jsxs("button", { onClick: () => setSelectedFolder(null), className: `w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${selectedFolder === null ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-gray-800'}`, children: ["All Bookmarks (", bookmarks.length, ")"] }), folders.map((folder) => {
                                const count = getBookmarksByFolder(folder.id).length;
                                return (_jsxs("div", { className: "flex items-center group", children: [_jsx("button", { onClick: () => setSelectedFolder(folder.id), className: `flex-1 text-left px-2 py-1.5 rounded text-sm ${selectedFolder === folder.id
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : 'hover:bg-gray-800'}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Folder, { size: 14 }), _jsx("span", { className: "flex-1", children: folder.name }), _jsxs("span", { className: "text-xs text-gray-500", children: ["(", count, ")"] })] }) }), folder.name !== 'Favorites' &&
                                            folder.name !== 'Work' &&
                                            folder.name !== 'Personal' && (_jsx("button", { onClick: () => removeFolder(folder.id), className: "p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded", title: "Delete folder", children: _jsx(X, { size: 12 }) }))] }, folder.id));
                            })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: filteredBookmarks.length === 0 ? (_jsx("div", { className: "text-center text-gray-400 mt-8", children: searchQuery ? 'No bookmarks found' : 'No bookmarks yet' })) : (_jsx("div", { className: "space-y-2", children: _jsx(AnimatePresence, { children: filteredBookmarks.map((bookmark) => (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-900 group", children: editingId === bookmark.id ? (_jsx(BookmarkEditor, { bookmark: bookmark, folders: folders.map(f => f.name), onSave: updates => handleSaveEdit(bookmark.id, updates), onCancel: () => setEditingId(null) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(Star, { size: 20, className: "text-yellow-400" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium text-sm truncate", children: bookmark.title }), _jsx("div", { className: "text-xs text-gray-400 truncate", children: bookmark.url }), bookmark.folder && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: [_jsx(Folder, { size: 10, className: "inline mr-1" }), bookmark.folder] }))] }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => handleOpenBookmark(bookmark.url), className: "p-1.5 hover:bg-gray-800 rounded", title: "Open bookmark", children: _jsx(ExternalLink, { size: 14 }) }), _jsx("button", { onClick: () => handleEdit(bookmark.id), className: "p-1.5 hover:bg-gray-800 rounded", title: "Edit bookmark", children: _jsx(Edit2, { size: 14 }) }), _jsx("button", { onClick: () => removeBookmark(bookmark.id), className: "p-1.5 hover:bg-red-500/20 rounded", title: "Delete bookmark", children: _jsx(Trash2, { size: 14 }) })] })] })) }, bookmark.id))) }) })) })] })] }));
}
function BookmarkEditor({ bookmark, folders, onSave, onCancel, }) {
    const [title, setTitle] = useState(bookmark.title);
    const [folder, setFolder] = useState(bookmark.folder || '');
    return (_jsxs("div", { className: "flex-1 flex items-center gap-2", children: [_jsx("input", { type: "text", value: title, onChange: e => setTitle(e.target.value), className: "flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none", autoFocus: true }), _jsxs("select", { value: folder, onChange: e => setFolder(e.target.value), className: "px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none", children: [_jsx("option", { value: "", children: "No folder" }), folders.map(f => (_jsx("option", { value: f, children: f }, f)))] }), _jsx("button", { onClick: () => onSave({ title, folder: folder || undefined }), className: "px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm", children: "Save" }), _jsx("button", { onClick: onCancel, className: "px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm", children: "Cancel" })] }));
}
