/**
 * Citation Tracker - Track sources and generate citations
 */

import { SessionWorkspace, ResearchSession } from '../workspace/SessionWorkspace';

export interface Citation {
  id: string;
  url: string;
  title: string;
  author?: string;
  date?: string;
  accessedDate: number;
  type: 'web' | 'paper' | 'book' | 'video' | 'other';
  credibility?: {
    score: number; // 0-100
    factors: string[];
  };
  metadata?: {
    domain?: string;
    publisher?: string;
    doi?: string;
    isbn?: string;
  };
}

export class CitationTracker {
  /**
   * Add citation to session
   */
  static addCitation(sessionId: string, citation: Omit<Citation, 'id' | 'accessedDate'>): Citation {
    const session = SessionWorkspace.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const fullCitation: Citation = {
      ...citation,
      id: `cite_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      accessedDate: Date.now(),
    };

    // Store in session metadata
    if (!session.metadata.sources) {
      session.metadata.sources = [];
    }
    
    (session.metadata.sources as any[]).push(fullCitation);
    SessionWorkspace.saveSession(session);

    return fullCitation;
  }

  /**
   * Get all citations for a session
   */
  static getCitations(sessionId: string): Citation[] {
    const session = SessionWorkspace.getSession(sessionId);
    if (!session) return [];

    return (session.metadata.sources as Citation[]) || [];
  }

  /**
   * Generate citation in various formats
   */
  static generateCitation(citation: Citation, format: 'apa' | 'mla' | 'chicago' | 'ieee' = 'apa'): string {
    switch (format) {
      case 'apa':
        return this.generateAPA(citation);
      case 'mla':
        return this.generateMLA(citation);
      case 'chicago':
        return this.generateChicago(citation);
      case 'ieee':
        return this.generateIEEE(citation);
      default:
        return this.generateAPA(citation);
    }
  }

  /**
   * Generate APA citation
   */
  private static generateAPA(citation: Citation): string {
    const author = citation.author || 'Unknown';
    const date = citation.date || new Date(citation.accessedDate).getFullYear().toString();
    const accessed = new Date(citation.accessedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `${author}. (${date}). ${citation.title}. Retrieved ${accessed}, from ${citation.url}`;
  }

  /**
   * Generate MLA citation
   */
  private static generateMLA(citation: Citation): string {
    const author = citation.author || 'Unknown';
    const date = citation.date || new Date(citation.accessedDate).getFullYear().toString();
    const accessed = new Date(citation.accessedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `"${citation.title}." ${citation.metadata?.publisher || 'Web'}, ${date}, ${citation.url}. Accessed ${accessed}.`;
  }

  /**
   * Generate Chicago citation
   */
  private static generateChicago(citation: Citation): string {
    const author = citation.author || 'Unknown';
    const date = citation.date || new Date(citation.accessedDate).getFullYear().toString();
    const accessed = new Date(citation.accessedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `${author}. "${citation.title}." Last modified ${date}. ${citation.url}. Accessed ${accessed}.`;
  }

  /**
   * Generate IEEE citation
   */
  private static generateIEEE(citation: Citation): string {
    const author = citation.author || 'Unknown';
    const date = citation.date || new Date(citation.accessedDate).getFullYear().toString();

    return `[1] ${author}, "${citation.title}," ${citation.metadata?.publisher || 'Online'}. Available: ${citation.url}. [Accessed: ${new Date(citation.accessedDate).toLocaleDateString()}].`;
  }

  /**
   * Calculate credibility score
   */
  static async calculateCredibility(citation: Citation): Promise<number> {
    let score = 50; // Base score
    const factors: string[] = [];

    // Domain credibility
    if (citation.metadata?.domain) {
      const domain = citation.metadata.domain.toLowerCase();
      if (domain.includes('.edu') || domain.includes('.gov')) {
        score += 20;
        factors.push('Educational or government domain');
      } else if (domain.includes('.org')) {
        score += 10;
        factors.push('Organization domain');
      } else if (domain.includes('.com')) {
        score += 5;
        factors.push('Commercial domain');
      }
    }

    // Author presence
    if (citation.author && citation.author !== 'Unknown') {
      score += 15;
      factors.push('Author identified');
    }

    // Date presence
    if (citation.date) {
      score += 10;
      factors.push('Publication date available');
    }

    // DOI/ISBN presence
    if (citation.metadata?.doi || citation.metadata?.isbn) {
      score += 15;
      factors.push('DOI or ISBN available');
    }

    // Publisher presence
    if (citation.metadata?.publisher) {
      score += 10;
      factors.push('Publisher identified');
    }

    // HTTPS
    if (citation.url.startsWith('https://')) {
      score += 5;
      factors.push('Secure connection');
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Export citations to BibTeX
   */
  static exportToBibTeX(citations: Citation[]): string {
    let bibtex = '';

    citations.forEach((cite, index) => {
      const key = `cite${index + 1}`;
      const type = cite.type === 'paper' ? 'article' : cite.type === 'book' ? 'book' : 'misc';

      bibtex += `@${type}{${key},\n`;
      if (cite.author) bibtex += `  author = {${cite.author}},\n`;
      bibtex += `  title = {${cite.title}},\n`;
      if (cite.date) bibtex += `  year = {${cite.date}},\n`;
      if (cite.metadata?.publisher) bibtex += `  publisher = {${cite.metadata.publisher}},\n`;
      if (cite.metadata?.doi) bibtex += `  doi = {${cite.metadata.doi}},\n`;
      bibtex += `  url = {${cite.url}},\n`;
      bibtex += `  urldate = {${new Date(cite.accessedDate).toISOString().split('T')[0]}},\n`;
      bibtex += `}\n\n`;
    });

    return bibtex;
  }

  /**
   * Export citations to JSON
   */
  static exportToJSON(citations: Citation[]): string {
    return JSON.stringify(citations, null, 2);
  }
}

