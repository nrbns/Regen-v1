/**
 * Citation Tracker - Track sources and generate citations
 */
import { SessionWorkspace } from '../workspace/SessionWorkspace';
export class CitationTracker {
    /**
     * Add citation to session
     */
    static addCitation(sessionId, citation) {
        const session = SessionWorkspace.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const fullCitation = {
            ...citation,
            id: `cite_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            accessedDate: Date.now(),
        };
        // Store in session metadata
        if (!session.metadata.sources) {
            session.metadata.sources = [];
        }
        session.metadata.sources.push(fullCitation);
        SessionWorkspace.saveSession(session);
        return fullCitation;
    }
    /**
     * Get all citations for a session
     */
    static getCitations(sessionId) {
        const session = SessionWorkspace.getSession(sessionId);
        if (!session)
            return [];
        return (session.metadata.sources || []);
    }
    /**
     * Generate citation in various formats
     */
    static generateCitation(citation, format = 'apa') {
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
    static generateAPA(citation) {
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
    static generateMLA(citation) {
        const _author = citation.author || 'Unknown';
        const _date = citation.date || new Date(citation.accessedDate).getFullYear().toString();
        const accessed = new Date(citation.accessedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return `"${citation.title}." ${citation.metadata?.publisher || 'Web'}, ${_date}, ${citation.url}. Accessed ${accessed}.`;
    }
    /**
     * Generate Chicago citation
     */
    static generateChicago(citation) {
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
    static generateIEEE(citation) {
        const _author = citation.author || 'Unknown';
        const _date = citation.date || new Date(citation.accessedDate).getFullYear().toString();
        return `[1] ${_author}, "${citation.title}," ${citation.metadata?.publisher || 'Online'}. Available: ${citation.url}. [Accessed: ${new Date(citation.accessedDate).toLocaleDateString()}].`;
    }
    /**
     * Calculate credibility score
     */
    static async calculateCredibility(citation) {
        let score = 50; // Base score
        const factors = [];
        // Domain credibility
        if (citation.metadata?.domain) {
            const domain = citation.metadata.domain.toLowerCase();
            if (domain.includes('.edu') || domain.includes('.gov')) {
                score += 20;
                factors.push('Educational or government domain');
            }
            else if (domain.includes('.org')) {
                score += 10;
                factors.push('Organization domain');
            }
            else if (domain.includes('.com')) {
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
    static exportToBibTeX(citations) {
        let bibtex = '';
        citations.forEach((cite, index) => {
            const key = `cite${index + 1}`;
            const type = cite.type === 'paper' ? 'article' : cite.type === 'book' ? 'book' : 'misc';
            bibtex += `@${type}{${key},\n`;
            if (cite.author)
                bibtex += `  author = {${cite.author}},\n`;
            bibtex += `  title = {${cite.title}},\n`;
            if (cite.date)
                bibtex += `  year = {${cite.date}},\n`;
            if (cite.metadata?.publisher)
                bibtex += `  publisher = {${cite.metadata.publisher}},\n`;
            if (cite.metadata?.doi)
                bibtex += `  doi = {${cite.metadata.doi}},\n`;
            bibtex += `  url = {${cite.url}},\n`;
            bibtex += `  urldate = {${new Date(cite.accessedDate).toISOString().split('T')[0]}},\n`;
            bibtex += `}\n\n`;
        });
        return bibtex;
    }
    /**
     * Export citations to JSON
     */
    static exportToJSON(citations) {
        return JSON.stringify(citations, null, 2);
    }
}
