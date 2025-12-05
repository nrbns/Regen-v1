/**
 * Session Workspace System - Real-time Research Sessions
 * Save/load/export research sessions with tabs, notes, summaries
 */
// Tauri API imports - optional, will be dynamically imported if available
// Using any type to avoid compile-time dependency on Tauri types
let tauriInvoke = null;
let tauriSave = null;
let tauriOpen = null;
let tauriWriteTextFile = null;
let tauriReadTextFile = null;
// Dynamically load Tauri APIs if available
if (typeof window !== 'undefined' && window.__TAURI__) {
    try {
        // @ts-ignore - Tauri APIs may not be available at compile time
        import('@tauri-apps/api/tauri')
            .then((m) => {
            tauriInvoke = m.invoke;
        })
            .catch(() => { });
        // @ts-ignore - Tauri APIs may not be available at compile time
        import('@tauri-apps/api/dialog')
            .then((m) => {
            tauriSave = m.save;
            tauriOpen = m.open;
        })
            .catch(() => { });
        // @ts-ignore - Tauri APIs may not be available at compile time
        import('@tauri-apps/api/fs')
            .then((m) => {
            tauriWriteTextFile = m.writeTextFile;
            tauriReadTextFile = m.readTextFile;
        })
            .catch(() => { });
    }
    catch {
        // Tauri APIs not available
    }
}
import { CitationTracker } from '../citations/CitationTracker';
export class SessionWorkspace {
    static storageKey = 'regen-sessions';
    static currentSessionId = null;
    /**
     * Create new session
     */
    static createSession(title, query) {
        const session = {
            id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            title,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tabs: [],
            notes: [],
            summaries: [],
            highlights: [],
            metadata: {
                query,
                keywords: [],
                sources: [],
            },
        };
        this.saveSession(session);
        this.currentSessionId = session.id;
        return session;
    }
    /**
     * Get current active session
     */
    static getCurrentSession() {
        if (!this.currentSessionId)
            return null;
        return this.getSession(this.currentSessionId);
    }
    /**
     * Get session by ID
     */
    static getSession(id) {
        const sessions = this.getAllSessions();
        return sessions.find(s => s.id === id) || null;
    }
    /**
     * Get all sessions
     */
    static getAllSessions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored)
                return [];
            return JSON.parse(stored);
        }
        catch {
            return [];
        }
    }
    /**
     * Save session (real-time)
     */
    static saveSession(session) {
        session.updatedAt = Date.now();
        const sessions = this.getAllSessions();
        const index = sessions.findIndex(s => s.id === session.id);
        if (index >= 0) {
            sessions[index] = session;
        }
        else {
            sessions.unshift(session);
        }
        // Keep last 100 sessions
        const trimmed = sessions.slice(0, 100);
        localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
        // Also save to SQLite via Tauri
        this._saveToSQLite(session).catch(console.error);
    }
    /**
     * Add tab to current session
     */
    static addTab(tab) {
        const session = this.getCurrentSession();
        if (!session)
            return;
        if (!session.tabs.find(t => t.id === tab.id)) {
            session.tabs.push(tab);
            this.saveSession(session);
        }
    }
    /**
     * Add note to current session
     */
    static addNote(note) {
        const session = this.getCurrentSession();
        if (!session) {
            // Create default session
            this.createSession('Untitled Session');
            return this.addNote(note);
        }
        const fullNote = {
            ...note,
            id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            createdAt: Date.now(),
        };
        session.notes.push(fullNote);
        this.saveSession(session);
        return fullNote;
    }
    /**
     * Add summary to current session
     */
    static addSummary(summary) {
        const session = this.getCurrentSession();
        if (!session) {
            this.createSession('Untitled Session');
            return this.addSummary(summary);
        }
        const fullSummary = {
            ...summary,
            id: `summary_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
        };
        session.summaries.push(fullSummary);
        this.saveSession(session);
        return fullSummary;
    }
    /**
     * Add highlight to current session
     */
    static addHighlight(highlight) {
        const session = this.getCurrentSession();
        if (!session) {
            this.createSession('Untitled Session');
            return this.addHighlight(highlight);
        }
        const fullHighlight = {
            ...highlight,
            id: `highlight_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            createdAt: Date.now(),
        };
        session.highlights.push(fullHighlight);
        this.saveSession(session);
        return fullHighlight;
    }
    /**
     * Export session to .omnisession (JSON)
     */
    static async exportSession(sessionId) {
        const session = this.getSession(sessionId);
        if (!session)
            throw new Error('Session not found');
        if (!tauriSave || !tauriWriteTextFile) {
            // Fallback to browser download
            const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.omnisession`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        const filePath = await tauriSave({
            filters: [
                {
                    name: 'OmniSession',
                    extensions: ['omnisession'],
                },
            ],
            defaultPath: `${session.title.replace(/[^a-z0-9]/gi, '_')}.omnisession`,
        });
        if (filePath) {
            await tauriWriteTextFile(filePath, JSON.stringify(session, null, 2));
        }
    }
    /**
     * Export session to PDF (via Markdown → PDF conversion)
     */
    static async exportToPDF(sessionId) {
        const session = this.getSession(sessionId);
        if (!session)
            throw new Error('Session not found');
        // First export to Markdown
        const markdown = await this.exportToMarkdownString(sessionId);
        // Use Tauri to convert Markdown to PDF
        if (tauriInvoke) {
            try {
                await tauriInvoke('export_markdown_to_pdf', {
                    markdown,
                    filename: `${session.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                });
                return;
            }
            catch (error) {
                console.error('[Workspace] PDF export failed:', error);
            }
        }
        // Fallback: download as Markdown
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
    /**
     * Export session to Markdown (returns string)
     */
    static async exportToMarkdownString(sessionId) {
        const session = this.getSession(sessionId);
        if (!session)
            throw new Error('Session not found');
        let markdown = `# ${session.title}\n\n`;
        markdown += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
        markdown += `Updated: ${new Date(session.updatedAt).toLocaleString()}\n\n`;
        if (session.metadata.query) {
            markdown += `## Query\n\n${session.metadata.query}\n\n`;
        }
        if (session.metadata.keywords && session.metadata.keywords.length > 0) {
            markdown += `## Keywords\n\n${session.metadata.keywords.join(', ')}\n\n`;
        }
        if (session.summaries.length > 0) {
            markdown += `## Summaries\n\n`;
            session.summaries.forEach(summary => {
                markdown += `### ${summary.url}\n\n${summary.summary}\n\n`;
                if (summary.keywords.length > 0) {
                    markdown += `**Keywords:** ${summary.keywords.join(', ')}\n\n`;
                }
            });
        }
        if (session.notes.length > 0) {
            markdown += `## Notes\n\n`;
            session.notes.forEach(note => {
                markdown += `### Note ${new Date(note.createdAt).toLocaleString()}\n\n`;
                if (note.url)
                    markdown += `**Source:** ${note.url}\n\n`;
                if (note.selection)
                    markdown += `> ${note.selection}\n\n`;
                markdown += `${note.content}\n\n`;
                if (note.tags && note.tags.length > 0) {
                    markdown += `**Tags:** ${note.tags.join(', ')}\n\n`;
                }
            });
        }
        if (session.highlights.length > 0) {
            markdown += `## Highlights\n\n`;
            session.highlights.forEach(highlight => {
                markdown += `> ${highlight.text}\n\n`;
                if (highlight.note)
                    markdown += `${highlight.note}\n\n`;
                markdown += `*Source: ${highlight.url}*\n\n`;
            });
        }
        if (session.tabs.length > 0) {
            markdown += `## Tabs\n\n`;
            session.tabs.forEach(tab => {
                markdown += `- [${tab.title}](${tab.url})\n`;
            });
        }
        // Add citations if available
        const citations = CitationTracker.getCitations(sessionId);
        if (citations.length > 0) {
            markdown += `\n## References\n\n`;
            citations.forEach((cite, index) => {
                markdown += `${index + 1}. ${CitationTracker.generateCitation(cite, 'apa')}\n`;
            });
        }
        return markdown;
    }
    /**
     * Export session to Markdown (with file save)
     */
    static async exportToMarkdown(sessionId) {
        const session = this.getSession(sessionId);
        if (!session)
            throw new Error('Session not found');
        const markdown = await this.exportToMarkdownString(sessionId);
        if (!tauriSave || !tauriWriteTextFile) {
            // Fallback to browser download
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        const filePath = await tauriSave({
            filters: [
                {
                    name: 'Markdown',
                    extensions: ['md'],
                },
            ],
            defaultPath: `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`,
        });
        if (filePath) {
            await tauriWriteTextFile(filePath, markdown);
        }
    }
    /**
     * Import session from .omnisession
     */
    static async importSession() {
        if (!tauriOpen || !tauriReadTextFile) {
            throw new Error('File import not available in this environment. Please use Tauri runtime.');
        }
        const filePath = await tauriOpen({
            filters: [
                {
                    name: 'OmniSession',
                    extensions: ['omnisession', 'json'],
                },
            ],
        });
        if (filePath && typeof filePath === 'string') {
            const content = await tauriReadTextFile(filePath);
            const session = JSON.parse(content);
            // Generate new ID to avoid conflicts
            session.id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            session.createdAt = Date.now();
            session.updatedAt = Date.now();
            this.saveSession(session);
            this.currentSessionId = session.id;
            return session;
        }
        throw new Error('No file selected');
    }
    /**
     * Delete session
     */
    static deleteSession(sessionId) {
        const sessions = this.getAllSessions();
        const filtered = sessions.filter(s => s.id !== sessionId);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        if (this.currentSessionId === sessionId) {
            this.currentSessionId = null;
        }
    }
    /**
     * Save to SQLite via Tauri
     */
    static async _saveToSQLite(session) {
        if (!tauriInvoke) {
            return; // SQLite save only available in Tauri
        }
        try {
            await tauriInvoke('save_session', { session });
        }
        catch (error) {
            console.error('[Workspace] SQLite save failed:', error);
            // Fallback to localStorage only
        }
    }
}
