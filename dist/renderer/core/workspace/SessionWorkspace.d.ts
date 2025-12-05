/**
 * Session Workspace System - Real-time Research Sessions
 * Save/load/export research sessions with tabs, notes, summaries
 */
export interface ResearchSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    tabs: SessionTab[];
    notes: SessionNote[];
    summaries: SessionSummary[];
    highlights: SessionHighlight[];
    metadata: {
        query?: string;
        keywords?: string[];
        sources?: string[];
    };
}
export interface SessionTab {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    snapshot?: string;
}
export interface SessionNote {
    id: string;
    content: string;
    url?: string;
    selection?: string;
    createdAt: number;
    tags?: string[];
}
export interface SessionSummary {
    id: string;
    url: string;
    summary: string;
    keywords: string[];
    length: 'short' | 'medium' | 'long';
    timestamp: number;
}
export interface SessionHighlight {
    id: string;
    url: string;
    text: string;
    note?: string;
    createdAt: number;
}
export declare class SessionWorkspace {
    private static storageKey;
    private static currentSessionId;
    /**
     * Create new session
     */
    static createSession(title: string, query?: string): ResearchSession;
    /**
     * Get current active session
     */
    static getCurrentSession(): ResearchSession | null;
    /**
     * Get session by ID
     */
    static getSession(id: string): ResearchSession | null;
    /**
     * Get all sessions
     */
    static getAllSessions(): ResearchSession[];
    /**
     * Save session (real-time)
     */
    static saveSession(session: ResearchSession): void;
    /**
     * Add tab to current session
     */
    static addTab(tab: SessionTab): void;
    /**
     * Add note to current session
     */
    static addNote(note: Omit<SessionNote, 'id' | 'createdAt'>): SessionNote;
    /**
     * Add summary to current session
     */
    static addSummary(summary: Omit<SessionSummary, 'id' | 'timestamp'>): SessionSummary;
    /**
     * Add highlight to current session
     */
    static addHighlight(highlight: Omit<SessionHighlight, 'id' | 'createdAt'>): SessionHighlight;
    /**
     * Export session to .omnisession (JSON)
     */
    static exportSession(sessionId: string): Promise<void>;
    /**
     * Export session to PDF (via Markdown → PDF conversion)
     */
    static exportToPDF(sessionId: string): Promise<void>;
    /**
     * Export session to Markdown (returns string)
     */
    static exportToMarkdownString(sessionId: string): Promise<string>;
    /**
     * Export session to Markdown (with file save)
     */
    static exportToMarkdown(sessionId: string): Promise<void>;
    /**
     * Import session from .omnisession
     */
    static importSession(): Promise<ResearchSession>;
    /**
     * Delete session
     */
    static deleteSession(sessionId: string): void;
    /**
     * Save to SQLite via Tauri
     */
    private static _saveToSQLite;
}
