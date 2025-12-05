/**
 * Unit Tests for Session Service - Tier 1
 * Tests session save/load functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession, getSessionSummary } from './session';
// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
describe('Session Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });
    describe('saveSession', () => {
        it('should save session to localStorage', () => {
            const tabs = [
                { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' },
                { id: 'tab-2', title: 'Tab 2', url: 'https://google.com' },
            ];
            const session = {
                tabs,
                activeTabId: 'tab-1',
                mode: 'Research',
                savedAt: Date.now(),
            };
            saveSession(session);
            const saved = localStorageMock.getItem('regen_session_v1');
            expect(saved).toBeTruthy();
            const parsed = JSON.parse(saved);
            expect(parsed.tabs).toHaveLength(2);
            expect(parsed.activeTabId).toBe('tab-1');
            expect(parsed.mode).toBe('Research');
        });
        it('should update savedAt timestamp', () => {
            const session = {
                tabs: [],
                activeTabId: null,
                mode: 'Research',
                savedAt: 1000,
            };
            saveSession(session);
            const saved = localStorageMock.getItem('regen_session_v1');
            const parsed = JSON.parse(saved);
            expect(parsed.savedAt).toBeGreaterThan(1000);
        });
    });
    describe('loadSession', () => {
        it('should load session from localStorage', () => {
            const tabs = [{ id: 'tab-1', title: 'Tab 1', url: 'https://example.com' }];
            const session = {
                tabs,
                activeTabId: 'tab-1',
                mode: 'Research',
                savedAt: Date.now(),
            };
            saveSession(session);
            const loaded = loadSession();
            expect(loaded).toBeTruthy();
            expect(loaded?.tabs).toHaveLength(1);
            expect(loaded?.activeTabId).toBe('tab-1');
            expect(loaded?.mode).toBe('Research');
        });
        it('should return null if no session exists', () => {
            const loaded = loadSession();
            expect(loaded).toBeNull();
        });
        it('should return null for invalid session data', () => {
            localStorageMock.setItem('regen_session_v1', 'invalid json');
            const loaded = loadSession();
            expect(loaded).toBeNull();
        });
        it('should return null for session without tabs array', () => {
            localStorageMock.setItem('regen_session_v1', JSON.stringify({ activeTabId: 'tab-1' }));
            const loaded = loadSession();
            expect(loaded).toBeNull();
        });
    });
    describe('clearSession', () => {
        it('should remove session from localStorage', () => {
            const session = {
                tabs: [{ id: 'tab-1', title: 'Tab 1', url: 'https://example.com' }],
                activeTabId: 'tab-1',
                mode: 'Research',
                savedAt: Date.now(),
            };
            saveSession(session);
            expect(localStorageMock.getItem('regen_session_v1')).toBeTruthy();
            clearSession();
            expect(localStorageMock.getItem('regen_session_v1')).toBeNull();
        });
    });
    describe('getSessionSummary', () => {
        it('should return session summary', () => {
            const tabs = [
                { id: 'tab-1', title: 'Tab 1', url: 'https://example.com' },
                { id: 'tab-2', title: 'Tab 2', url: 'https://google.com' },
            ];
            const session = {
                tabs,
                activeTabId: 'tab-1',
                mode: 'Research',
                savedAt: Date.now(),
            };
            saveSession(session);
            const summary = getSessionSummary();
            expect(summary).toBeTruthy();
            expect(summary?.tabCount).toBe(2);
            expect(summary?.savedAt).toBeGreaterThan(0);
        });
        it('should return null if no session exists', () => {
            const summary = getSessionSummary();
            expect(summary).toBeNull();
        });
    });
});
