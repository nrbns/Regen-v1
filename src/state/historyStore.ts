/**
 * History Store - Enhanced browsing history tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitCount: number;
  lastVisitAt: number;
  firstVisitAt: number;
  referrer?: string;
  transitionType?: 'link' | 'typed' | 'auto_bookmark' | 'auto_subframe' | 'manual_subframe' | 'generated' | 'start_page' | 'form_submit' | 'reload' | 'keyword' | 'keyword_generated';
}

interface HistoryStore {
  entries: HistoryEntry[];
  maxEntries: number;
  addEntry: (url: string, title: string, favicon?: string, referrer?: string, transitionType?: HistoryEntry['transitionType']) => void;
  removeEntry: (id: string) => void;
  removeEntries: (ids: string[]) => void;
  clearHistory: () => void;
  clearHistoryRange: (startDate: number, endDate: number) => void;
  searchHistory: (query: string) => HistoryEntry[];
  getHistoryByDate: (date: Date) => HistoryEntry[];
  getTopSites: (limit?: number) => HistoryEntry[];
  getRecentHistory: (limit?: number) => HistoryEntry[];
  getHistoryByDomain: (domain: string) => HistoryEntry[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      maxEntries: 10000,
      
      addEntry: (url, title, favicon, referrer, transitionType) => {
        try {
          // Normalize URL
          const urlObj = new URL(url);
          const normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
          
          const existing = get().entries.find((e) => e.url === normalizedUrl);
          
          if (existing) {
            // Update existing entry
            set((state) => ({
              entries: state.entries.map((e) =>
                e.id === existing.id
                  ? {
                      ...e,
                      title: title || e.title,
                      favicon: favicon || e.favicon,
                      visitCount: e.visitCount + 1,
                      lastVisitAt: Date.now(),
                      referrer: referrer || e.referrer,
                      transitionType: transitionType || e.transitionType,
                    }
                  : e
              ),
            }));
          } else {
            // Add new entry
            const newEntry: HistoryEntry = {
              id: crypto.randomUUID(),
              url: normalizedUrl,
              title: title || urlObj.hostname,
              favicon,
              visitCount: 1,
              lastVisitAt: Date.now(),
              firstVisitAt: Date.now(),
              referrer,
              transitionType: transitionType || 'link',
            };
            
            set((state) => {
              const entries = [...state.entries, newEntry];
              // Trim to maxEntries (keep most recent)
              if (entries.length > state.maxEntries) {
                entries.sort((a, b) => b.lastVisitAt - a.lastVisitAt);
                return { entries: entries.slice(0, state.maxEntries) };
              }
              return { entries };
            });
          }
        } catch (e) {
          console.warn('[HistoryStore] Failed to add entry:', e);
        }
      },
      
      removeEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },
      
      removeEntries: (ids) => {
        set((state) => ({
          entries: state.entries.filter((e) => !ids.includes(e.id)),
        }));
      },
      
      clearHistory: () => {
        set({ entries: [] });
      },
      
      clearHistoryRange: (startDate, endDate) => {
        set((state) => ({
          entries: state.entries.filter(
            (e) => e.lastVisitAt < startDate || e.lastVisitAt > endDate
          ),
        }));
      },
      
      searchHistory: (query) => {
        const q = query.toLowerCase();
        return get()
          .entries.filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.url.toLowerCase().includes(q)
          )
          .sort((a, b) => b.lastVisitAt - a.lastVisitAt);
      },
      
      getHistoryByDate: (date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return get()
          .entries.filter(
            (e) => e.lastVisitAt >= start.getTime() && e.lastVisitAt <= end.getTime()
          )
          .sort((a, b) => b.lastVisitAt - a.lastVisitAt);
      },
      
      getTopSites: (limit = 10) => {
        return get()
          .entries.sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, limit);
      },
      
      getRecentHistory: (limit = 20) => {
        return get()
          .entries.sort((a, b) => b.lastVisitAt - a.lastVisitAt)
          .slice(0, limit);
      },
      
      getHistoryByDomain: (domain) => {
        return get()
          .entries.filter((e) => {
            try {
              const url = new URL(e.url);
              return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
            } catch {
              return false;
            }
          })
          .sort((a, b) => b.lastVisitAt - a.lastVisitAt);
      },
    }),
    {
      name: 'omnibrowser-history',
    }
  )
);

