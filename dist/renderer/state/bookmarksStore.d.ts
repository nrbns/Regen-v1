/**
 * Bookmarks Store - Tier 2
 * Manages user bookmarks
 */
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
    add: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
    remove: (id: string) => void;
    update: (id: string, updates: Partial<Bookmark>) => void;
    getByUrl: (url: string) => Bookmark | undefined;
    search: (query: string) => Bookmark[];
    clear: () => void;
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
export declare const useBookmarksStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<BookmarksState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<BookmarksState, BookmarksState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: BookmarksState) => void) => () => void;
        onFinishHydration: (fn: (state: BookmarksState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<BookmarksState, BookmarksState>>;
    };
}>;
export {};
