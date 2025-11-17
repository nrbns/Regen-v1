/**
 * Bookmarks Store - Bookmark management with folders and tags
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  folder?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  description?: string;
}

interface BookmarksStore {
  bookmarks: Bookmark[];
  folders: string[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  getBookmarksByFolder: (folder: string) => Bookmark[];
  searchBookmarks: (query: string) => Bookmark[];
  addFolder: (folder: string) => void;
  removeFolder: (folder: string) => void;
  isBookmarked: (url: string) => boolean;
  getBookmarkByUrl: (url: string) => Bookmark | undefined;
}

export const useBookmarksStore = create<BookmarksStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      folders: ['Favorites', 'Work', 'Personal'],
      
      addBookmark: (bookmark) => {
        // Check if already bookmarked
        const existing = get().bookmarks.find((b) => b.url === bookmark.url);
        if (existing) {
          get().updateBookmark(existing.id, bookmark);
          return;
        }
        
        const newBookmark: Bookmark = {
          ...bookmark,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          bookmarks: [...state.bookmarks, newBookmark],
        }));
      },
      
      removeBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },
      
      updateBookmark: (id, updates) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === id
              ? { ...b, ...updates, updatedAt: Date.now() }
              : b
          ),
        }));
      },
      
      getBookmarksByFolder: (folder) => {
        return get().bookmarks.filter((b) => b.folder === folder);
      },
      
      searchBookmarks: (query) => {
        const q = query.toLowerCase();
        return get().bookmarks.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
            b.description?.toLowerCase().includes(q)
        );
      },
      
      addFolder: (folder) => {
        set((state) => {
          if (state.folders.includes(folder)) return state;
          return { folders: [...state.folders, folder] };
        });
      },
      
      removeFolder: (folder) => {
        set((state) => ({
          folders: state.folders.filter((f) => f !== folder),
          // Move bookmarks from removed folder to root
          bookmarks: state.bookmarks.map((b) =>
            b.folder === folder ? { ...b, folder: undefined } : b
          ),
        }));
      },
      
      isBookmarked: (url) => {
        return get().bookmarks.some((b) => b.url === url);
      },
      
      getBookmarkByUrl: (url) => {
        return get().bookmarks.find((b) => b.url === url);
      },
    }),
    {
      name: 'omnibrowser-bookmarks',
    }
  )
);

