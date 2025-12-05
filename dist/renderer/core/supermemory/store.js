/**
 * SuperMemory Store - Personal long-term memory & personalization layer
 * Uses localStorage with IndexedDB fallback for larger data
 */
const STORAGE_PREFIX = 'sm-';
const MAX_EVENTS = 10000; // Limit total events
// const MAX_EVENTS_PER_TYPE = 1000; // Limit per event type // Unused for now
class MemoryStore {
    db = null;
    useIndexedDB = false;
    /**
     * Initialize IndexedDB if available
     * Now uses the enhanced database with migrations
     */
    async init() {
        if (!('indexedDB' in window)) {
            this.useIndexedDB = false;
            return;
        }
        try {
            // Use enhanced database
            const { superMemoryDB } = await import('./db');
            await superMemoryDB.init();
            this.useIndexedDB = true;
            // Get database instance for backward compatibility
            this.db = superMemoryDB.db;
        }
        catch (error) {
            console.warn('[SuperMemory] IndexedDB unavailable, using localStorage:', error);
            this.useIndexedDB = false;
        }
    }
    /**
     * Get value from storage
     */
    get(key) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return null;
            }
            const item = localStorage.getItem(STORAGE_PREFIX + key);
            return item ? JSON.parse(item) : null;
        }
        catch (error) {
            console.error('[SuperMemory] Failed to get:', key, error);
            return null;
        }
    }
    /**
     * Set value in storage
     */
    set(key, value) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return;
            }
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        }
        catch (error) {
            console.error('[SuperMemory] Failed to set:', key, error);
        }
    }
    /**
     * Push item to array in storage
     */
    push(key, item) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return;
            }
            const arr = this.get(key) || [];
            arr.unshift(item); // Add to beginning
            // Limit array size
            if (arr.length > MAX_EVENTS) {
                arr.splice(MAX_EVENTS);
            }
            this.set(key, arr);
        }
        catch (error) {
            console.error('[SuperMemory] Failed to push:', key, error);
        }
    }
    /**
     * Save a memory event
     * Uses enhanced database with proper write→embed→store pipeline
     */
    async saveEvent(event) {
        const fullEvent = {
            ...event,
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ts: Date.now(),
            score: this.calculateScore(event),
        };
        if (this.useIndexedDB) {
            try {
                const { superMemoryDB } = await import('./db');
                await superMemoryDB.saveEvent(fullEvent);
                return fullEvent.id;
            }
            catch (error) {
                console.warn('[SuperMemory] IndexedDB save failed, falling back to localStorage:', error);
                this.useIndexedDB = false;
            }
        }
        // Fallback to localStorage
        this.push('events', fullEvent);
        this.cleanupOldEventsSync();
        return fullEvent.id;
    }
    /**
     * Get events with optional filters
     */
    async getEvents(filters) {
        if (this.useIndexedDB) {
            try {
                const { superMemoryDB } = await import('./db');
                return await superMemoryDB.getEvents(filters);
            }
            catch (error) {
                console.warn('[SuperMemory] IndexedDB read failed, falling back to localStorage:', error);
                this.useIndexedDB = false;
            }
        }
        // Fallback to localStorage
        const allEvents = this.get('events') || [];
        let filtered = allEvents;
        if (filters?.type) {
            filtered = filtered.filter(e => e.type === filters.type);
        }
        if (filters?.since) {
            filtered = filtered.filter(e => e.ts >= filters.since);
        }
        if (filters?.until) {
            filtered = filtered.filter(e => e.ts <= filters.until);
        }
        if (filters?.pinned !== undefined) {
            filtered = filtered.filter(e => Boolean(e.metadata?.pinned) === filters.pinned);
        }
        if (filters?.tags && filters.tags.length > 0) {
            filtered = filtered.filter((e) => {
                const eventTags = e.metadata?.tags || [];
                return filters.tags.every((tag) => eventTags.includes(tag));
            });
        }
        return filtered.slice(0, filters?.limit || 100);
    }
    /**
     * Calculate recency + frequency score
     */
    calculateScore(event) {
        const allEvents = this.get('events') || [];
        // Frequency: how many times this value appeared
        const frequency = allEvents.filter(e => e.type === event.type &&
            JSON.stringify(e.value) === JSON.stringify(event.value)).length;
        // Recency: newer events get higher score (decay over time)
        // const now = Date.now(); // Unused for now
        const recency = 1; // Current event is most recent
        // Combined score (frequency * 0.6 + recency * 0.4)
        return frequency * 0.6 + recency * 0.4;
    }
    /**
     * Cleanup old events (IndexedDB)
     */
    async cleanupOldEvents() {
        if (!this.db)
            return;
        try {
            const transaction = this.db.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const index = store.index('ts');
            // Delete events older than 90 days
            const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
            const range = IDBKeyRange.upperBound(cutoff);
            return new Promise((resolve, reject) => {
                const request = index.openCursor(range);
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                    else {
                        resolve();
                    }
                };
                request.onerror = () => reject(request.error);
            });
        }
        catch (error) {
            console.warn('[SuperMemory] Cleanup failed:', error);
        }
    }
    /**
     * Cleanup old events (localStorage)
     */
    cleanupOldEventsSync() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        const events = this.get('events') || [];
        // Remove events older than 90 days
        const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const filtered = events.filter(e => e.ts >= cutoff);
        // Limit total events
        if (filtered.length > MAX_EVENTS) {
            filtered.splice(MAX_EVENTS);
        }
        this.set('events', filtered);
    }
    /**
     * Delete all events
     */
    async forgetAll() {
        if (this.useIndexedDB && this.db) {
            try {
                const transaction = this.db.transaction(['events'], 'readwrite');
                const store = transaction.objectStore('events');
                await store.clear();
            }
            catch (error) {
                console.warn('[SuperMemory] Failed to clear IndexedDB:', error);
            }
        }
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(STORAGE_PREFIX + 'events');
        }
    }
    /**
     * Export all events (for user export)
     */
    async export() {
        return this.getEvents({ limit: MAX_EVENTS });
    }
    /**
     * Get single event by ID
     */
    async getEventById(eventId) {
        if (this.useIndexedDB) {
            try {
                const { superMemoryDB } = await import('./db');
                return await superMemoryDB.getEvent(eventId);
            }
            catch (error) {
                console.warn('[SuperMemory] IndexedDB getEvent failed, falling back to localStorage:', error);
                this.useIndexedDB = false;
            }
        }
        const allEvents = this.get('events') || [];
        return allEvents.find((event) => event.id === eventId) || null;
    }
    /**
     * Get events by ID list (preserves order)
     */
    async getEventsByIds(eventIds) {
        if (eventIds.length === 0)
            return [];
        if (this.useIndexedDB) {
            try {
                const { superMemoryDB } = await import('./db');
                return await superMemoryDB.getEventsByIds(eventIds);
            }
            catch (error) {
                console.warn('[SuperMemory] IndexedDB getEventsByIds failed, falling back to localStorage:', error);
                this.useIndexedDB = false;
            }
        }
        const allEvents = this.get('events') || [];
        const map = new Map(allEvents.map((event) => [event.id, event]));
        return eventIds
            .map((id) => map.get(id))
            .filter((event) => Boolean(event));
    }
}
// Singleton instance
const memoryStoreInstance = new MemoryStore();
export const MemoryStoreInstance = memoryStoreInstance; // Export instance
export { MemoryStore }; // Export class for type usage
// Initialize on load
if (typeof window !== 'undefined') {
    memoryStoreInstance.init().catch(console.error);
}
