/**
 * Bookmarks Store - Tier 2
 * Manages user bookmarks
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  tags?: string[];
  description?: string;
  folder?: string;
};

export type BookmarkFolder = {
  id: string;
  name: string;
  createdAt: number;
};

type BookmarksState = {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  // Legacy methods
  add: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
  update: (id: string, updates: Partial<Bookmark>) => void;
  getByUrl: (url: string) => Bookmark | undefined;
  search: (query: string) => Bookmark[];
  clear: () => void;
  // New methods expected by components
  isBookmarked: (url: string) => boolean;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  getBookmarkByUrl: (url: string) => Bookmark | undefined;
  searchBookmarks: (query: string) => Bookmark[];
  getBookmarksByFolder: (folderId: string) => Bookmark[];
  addFolder: (name: string) => void;
  removeFolder: (id: string) => void;
};

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => {
      const createBookmark = (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark => ({
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
        remove: id =>
          set(state => ({
            bookmarks: state.bookmarks.filter(b => b.id !== id),
          })),
        update: (id, updates) =>
          set(state => ({
            bookmarks: state.bookmarks.map(b => (b.id === id ? { ...b, ...updates } : b)),
          })),
        getByUrl: url => {
          return get().bookmarks.find(b => b.url === url);
        },
        search: query => {
          const lowerQuery = query.toLowerCase();
          return get().bookmarks.filter(
            b =>
              b.title.toLowerCase().includes(lowerQuery) ||
              b.url.toLowerCase().includes(lowerQuery) ||
              b.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
              b.description?.toLowerCase().includes(lowerQuery)
          );
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
          const newFolder: BookmarkFolder = {
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
            bookmarks: state.bookmarks.map(b =>
              b.folder === id ? { ...b, folder: undefined } : b
            ),
          }));
        },
      };
    },
    {
      name: 'omnibrowser_bookmarks_v1',
    }
  )
);
