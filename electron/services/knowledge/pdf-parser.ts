/**
 * PDF & Academic Parser
 * Extracts metadata, citations, and generates BibTeX
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export interface PDFMetadata {
  title?: string;
  author?: string[];
  subject?: string;
  keywords?: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  journal?: string;
}

export interface Citation {
  text: string;
  authors?: string[];
  year?: number;
  title?: string;
  journal?: string;
  url?: string;
}

export interface BibTeXEntry {
  type: 'article' | 'inproceedings' | 'book' | 'techreport' | 'misc';
  key: string;
  title?: string;
  author?: string;
  year?: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string;
}

export class PDFParser {
  /**
   * Parse PDF file and extract metadata
   */
  async parsePDF(filePath: string): Promise<{ metadata: PDFMetadata; text: string; citations: Citation[] }> {
    try {
      // Try using pdf-parse if available
      let pdfParse: any;
      try {
        pdfParse = require('pdf-parse');
      } catch {
        throw new Error('pdf-parse not available');
      }

      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);

      const metadata: PDFMetadata = {
        title: data.info?.Title,
        author: data.info?.Author ? [data.info.Author] : undefined,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords ? data.info.Keywords.split(',') : undefined,
        year: data.info?.CreationDate ? this.extractYear(data.info.CreationDate) : undefined,
      };

      const text = data.text;

      // Extract citations using patterns
      const citations = this.extractCitations(text);

      // Try to extract DOI
      const doiMatch = text.match(/doi[:\s]*([10]\.[0-9]{4,}[^\s]+)/i);
      if (doiMatch) {
        metadata.doi = doiMatch[1];
      }

      // Try to extract abstract
      const abstractMatch = text.match(/(?:abstract|summary)[:\s]*([\s\S]{100,500})/i);
      if (abstractMatch) {
        metadata.abstract = abstractMatch[1].trim().substring(0, 500);
      }

      return { metadata, text, citations };
    } catch (error) {
      console.error('[PDFParser] Parse failed:', error);
      throw error;
    }
  }

  /**
   * Generate BibTeX entry from metadata
   */
  generateBibTeX(metadata: PDFMetadata, citations: Citation[] = []): string {
    const entries: BibTeXEntry[] = [];

    // Main entry
    if (metadata.title) {
      const entry: BibTeXEntry = {
        type: (metadata as any).journal ? 'article' : 'misc',
        key: this.generateBibTeXKey(metadata.title, metadata.author?.[0]),
        title: metadata.title,
        author: metadata.author?.join(' and '),
        year: metadata.year?.toString(),
        journal: (metadata as any).journal || metadata.journal,
        doi: metadata.doi,
        url: metadata.url,
        abstract: metadata.abstract,
        keywords: metadata.keywords?.join(', '),
      };

      entries.push(entry);
    }

    // Citation entries
    for (const citation of citations) {
      if (citation.title || citation.authors?.length) {
        entries.push({
          type: citation.journal ? 'article' : 'misc',
          key: this.generateBibTeXKey(citation.title || '', citation.authors?.[0]),
          title: citation.title,
          author: citation.authors?.join(' and '),
          year: citation.year?.toString(),
          journal: citation.journal,
          url: citation.url,
        });
      }
    }

    return entries.map(e => this.formatBibTeXEntry(e)).join('\n\n');
  }

  /**
   * Extract citations from text
   */
  private extractCitations(text: string): Citation[] {
    const citations: Citation[] = [];

    // Pattern 1: Author (Year) format
    const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+et\s+al\.)?)\s*\((\d{4})\)/g;
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      citations.push({
        text: match[0],
        authors: match[1].split(/\s+and\s+/i),
        year: parseInt(match[2]),
      });
    }

    // Pattern 2: Author, Year. Title format
    const pattern2 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+et\s+al\.)?),\s*(\d{4})\.\s*"([^"]+)"/g;
    while ((match = pattern2.exec(text)) !== null) {
      citations.push({
        text: match[0],
        authors: match[1].split(/\s+and\s+/i),
        year: parseInt(match[2]),
        title: match[3],
      });
    }

    return citations;
  }

  /**
   * Generate BibTeX key from title and author
   */
  private generateBibTeXKey(title: string, author?: string): string {
    const authorPart = author ? author.split(/\s+/).pop()?.toLowerCase() || 'unknown' : 'unknown';
    const titlePart = title
      .split(/\s+/)
      .slice(0, 3)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      .join('');
    return `${authorPart}${titlePart}${Date.now().toString().slice(-4)}`;
  }

  /**
   * Format BibTeX entry as string
   */
  private formatBibTeXEntry(entry: BibTeXEntry): string {
    const fields: string[] = [];
    
    if (entry.title) fields.push(`  title = {${entry.title}}`);
    if (entry.author) fields.push(`  author = {${entry.author}}`);
    if (entry.year) fields.push(`  year = {${entry.year}}`);
    if (entry.journal) fields.push(`  journal = {${entry.journal}}`);
    if (entry.booktitle) fields.push(`  booktitle = {${entry.booktitle}}`);
    if (entry.publisher) fields.push(`  publisher = {${entry.publisher}}`);
    if (entry.doi) fields.push(`  doi = {${entry.doi}}`);
    if (entry.url) fields.push(`  url = {${entry.url}}`);
    if (entry.abstract) fields.push(`  abstract = {${entry.abstract}}`);
    if (entry.keywords) fields.push(`  keywords = {${entry.keywords}}`);

    return `@${entry.type}{${entry.key},\n${fields.join(',\n')}\n}`;
  }

  /**
   * Extract year from date string
   */
  private extractYear(dateStr: string): number | undefined {
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1]);
    }
    return undefined;
  }
}

// Singleton instance
let pdfParserInstance: PDFParser | null = null;

export function getPDFParser(): PDFParser {
  if (!pdfParserInstance) {
    pdfParserInstance = new PDFParser();
  }
  return pdfParserInstance;
}

