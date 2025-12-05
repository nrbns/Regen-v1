/**
 * Bookmarks Store - Tier 2
 * Manages user bookmarks
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useBookmarksStore = create()(persist((set, get) => {
    const createBookmark = (bookmark) => ({
        ...bookmark,
        id: `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
    });
    return {
        bookmarks: [],
        folders: [],
        // Legacy methods
        add: bookmark => {
            const existing = get().bookmarks.find(b => b.url === bookmark.url);
            if (existing) {
                get().update(existing.id, bookmark);
                return;
            }
            const newBookmark = createBookmark(bookmark);
            set(state => ({
                bookmarks: [...state.bookmarks, newBookmark],
            }));
        },
        remove: id => set(state => ({
            bookmarks: state.bookmarks.filter(b => b.id !== id),
        })),
        update: (id, updates) => set(state => ({
            bookmarks: state.bookmarks.map(b => (b.id === id ? { ...b, ...updates } : b)),
        })),
        getByUrl: url => {
            return get().bookmarks.find(b => b.url === url);
        },
        search: query => {
            const lowerQuery = query.toLowerCase();
            return get().bookmarks.filter(b => b.title.toLowerCase().includes(lowerQuery) ||
                b.url.toLowerCase().includes(lowerQuery) ||
                b.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                b.description?.toLowerCase().includes(lowerQuery));
        },
        clear: () => set({ bookmarks: [], folders: [] }),
        // New methods (aliases/implementations)
        isBookmarked: url => {
            return get().bookmarks.some(b => b.url === url);
        },
        addBookmark: bookmark => {
            get().add(bookmark);
        },
        removeBookmark: id => {
            get().remove(id);
        },
        updateBookmark: (id, updates) => {
            get().update(id, updates);
        },
        getBookmarkByUrl: url => {
            return get().getByUrl(url);
        },
        searchBookmarks: query => {
            return get().search(query);
        },
        getBookmarksByFolder: folderId => {
            return get().bookmarks.filter(b => b.folder === folderId);
        },
        addFolder: name => {
            const newFolder = {
                id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name,
                createdAt: Date.now(),
            };
            set(state => ({
                folders: [...state.folders, newFolder],
            }));
        },
        removeFolder: id => {
            set(state => ({
                folders: state.folders.filter(f => f.id !== id),
                bookmarks: state.bookmarks.map(b => b.folder === id ? { ...b, folder: undefined } : b),
            }));
        },
    };
}, {
    name: 'regen_bookmarks_v1',
}));
