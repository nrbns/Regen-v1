/**
 * Session Workspace System - Real-time Research Sessions
 * Save/load/export research sessions with tabs, notes, summaries
 */

import { invoke } from '@tauri-apps/api/tauri';
import { save, open } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';
import { CitationTracker } from '../citations/CitationTracker';

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
  snapshot?: string; // Text snapshot for tab discarding
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

export class SessionWorkspace {
  private static storageKey = 'regen-sessions';
  private static currentSessionId: string | null = null;

  /**
   * Create new session
   */
  static createSession(title: string, query?: string): ResearchSession {
    const session: ResearchSession = {
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
  static getCurrentSession(): ResearchSession | null {
    if (!this.currentSessionId) return null;
    return this.getSession(this.currentSessionId);
  }

  /**
   * Get session by ID
   */
  static getSession(id: string): ResearchSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  }

  /**
   * Get all sessions
   */
  static getAllSessions(): ResearchSession[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Save session (real-time)
   */
  static saveSession(session: ResearchSession): void {
    session.updatedAt = Date.now();
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
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
  static addTab(tab: SessionTab): void {
    const session = this.getCurrentSession();
    if (!session) return;

    if (!session.tabs.find(t => t.id === tab.id)) {
      session.tabs.push(tab);
      this.saveSession(session);
    }
  }

  /**
   * Add note to current session
   */
  static addNote(note: Omit<SessionNote, 'id' | 'createdAt'>): SessionNote {
    const session = this.getCurrentSession();
    if (!session) {
      // Create default session
      const newSession = this.createSession('Untitled Session');
      return this.addNote(note);
    }

    const fullNote: SessionNote = {
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
  static addSummary(summary: Omit<SessionSummary, 'id' | 'timestamp'>): SessionSummary {
    const session = this.getCurrentSession();
    if (!session) {
      const newSession = this.createSession('Untitled Session');
      return this.addSummary(summary);
    }

    const fullSummary: SessionSummary = {
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
  static addHighlight(highlight: Omit<SessionHighlight, 'id' | 'createdAt'>): SessionHighlight {
    const session = this.getCurrentSession();
    if (!session) {
      const newSession = this.createSession('Untitled Session');
      return this.addHighlight(highlight);
    }

    const fullHighlight: SessionHighlight = {
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
  static async exportSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const filePath = await save({
      filters: [{
        name: 'OmniSession',
        extensions: ['omnisession'],
      }],
      defaultPath: `${session.title.replace(/[^a-z0-9]/gi, '_')}.omnisession`,
    });

    if (filePath) {
      await writeTextFile(filePath, JSON.stringify(session, null, 2));
    }
  }

  /**
   * Export session to PDF (via Markdown → PDF conversion)
   */
  static async exportToPDF(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // First export to Markdown
    const markdown = await this.exportToMarkdownString(sessionId);
    
    // Use Tauri to convert Markdown to PDF
    try {
      await invoke('export_markdown_to_pdf', {
        markdown,
        filename: `${session.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      });
    } catch (error) {
      console.error('[Workspace] PDF export failed:', error);
      // Fallback: download as Markdown
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Export session to Markdown (returns string)
   */
  static async exportToMarkdownString(sessionId: string): Promise<string> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

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
        if (note.url) markdown += `**Source:** ${note.url}\n\n`;
        if (note.selection) markdown += `> ${note.selection}\n\n`;
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
        if (highlight.note) markdown += `${highlight.note}\n\n`;
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
  static async exportToMarkdown(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const markdown = await this.exportToMarkdownString(sessionId);

    const filePath = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md'],
      }],
      defaultPath: `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`,
    });

    if (filePath) {
      await writeTextFile(filePath, markdown);
    }
  }

  /**
   * Import session from .omnisession
   */
  static async importSession(): Promise<ResearchSession> {
    const filePath = await open({
      filters: [{
        name: 'OmniSession',
        extensions: ['omnisession', 'json'],
      }],
    });

    if (filePath && typeof filePath === 'string') {
      const content = await readTextFile(filePath);
      const session: ResearchSession = JSON.parse(content);
      
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
  static deleteSession(sessionId: string): void {
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
  private static async _saveToSQLite(session: ResearchSession): Promise<void> {
    try {
      await invoke('save_session', { session });
    } catch (error) {
      console.error('[Workspace] SQLite save failed:', error);
      // Fallback to localStorage only
    }
  }
}

