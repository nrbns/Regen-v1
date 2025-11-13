/**
 * Research Ingestion Pipeline
 * Handles parsing, chunking, and metadata extraction for research documents
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  metadata: {
    sourceType: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
    url?: string;
    title?: string;
    page?: number;
    section?: string;
  };
}

export interface DocumentMetadata {
  id: string;
  type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
  filename?: string;
  url?: string;
  title: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
  path: string;
}

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks

/**
 * Parse text file (TXT, MD)
 */
async function parseTextFile(filePath: string, _mimeType: string): Promise<{ text: string; title: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || path.basename(filePath, path.extname(filePath));
  
  return { text: content, title };
}

/**
 * Parse HTML file
 */
async function parseHtmlFile(filePath: string): Promise<{ text: string; title: string }> {
  const html = await fs.readFile(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  
  if (article) {
    return {
      text: article.textContent || '',
      title: article.title || path.basename(filePath, '.html'),
    };
  }
  
  // Fallback: extract from body
  const bodyText = dom.window.document.body?.textContent || '';
  const title = dom.window.document.title || path.basename(filePath, '.html');
  
  return { text: bodyText, title };
}

/**
 * Parse PDF file using pdf-parse
 */
async function parsePdfFile(filePath: string): Promise<{ text: string; title: string }> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Extract title from PDF info or filename
    const title = pdfData.info?.Title || path.basename(filePath, '.pdf');
    
    return {
      text: pdfData.text,
      title: title.trim() || path.basename(filePath, '.pdf'),
    };
  } catch (error) {
    console.error('Failed to parse PDF:', error);
    return {
      text: '',
      title: path.basename(filePath, '.pdf'),
    };
  }
}

/**
 * Parse DOCX file using mammoth
 */
async function parseDocxFile(filePath: string): Promise<{ text: string; title: string }> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    const title = path.basename(filePath, path.extname(filePath));
    
    return {
      text: result.value,
      title,
    };
  } catch (error) {
    console.error('Failed to parse DOCX:', error);
    return {
      text: '',
      title: path.basename(filePath, path.extname(filePath)),
    };
  }
}

/**
 * Chunk text into overlapping segments
 */
function chunkText(
  text: string,
  documentId: string,
  metadata: DocumentChunk['metadata'],
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let startChar = 0;
  let chunkIndex = 0;

  while (startChar < text.length) {
    const endChar = Math.min(startChar + chunkSize, text.length);
    // const chunkText = text.slice(startChar, endChar);

    // Try to break at sentence boundaries
    let actualEnd = endChar;
    if (endChar < text.length) {
      const nextSentence = text.slice(endChar, endChar + 100).match(/[.!?]\s+/);
      if (nextSentence) {
        actualEnd = endChar + nextSentence.index! + nextSentence[0].length;
      }
    }

    const content = text.slice(startChar, actualEnd).trim();
    
    if (content.length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        documentId,
        content,
        chunkIndex,
        startChar,
        endChar: actualEnd,
        metadata: {
          ...metadata,
          section: chunkIndex === 0 ? 'introduction' : `section-${chunkIndex}`,
        },
      });
    }

    // Move start position with overlap
    startChar = Math.max(startChar + 1, actualEnd - overlap);
    chunkIndex++;
  }

  return chunks;
}

/**
 * Process a document file and create chunks
 */
export async function ingestDocument(
  filePath: string,
  documentId: string,
  sourceType: 'pdf' | 'docx' | 'txt' | 'md' | 'html',
  metadata?: { url?: string; title?: string }
): Promise<{ metadata: DocumentMetadata; chunks: DocumentChunk[] }> {
  let text: string;
  let title: string;

  // Parse based on file type
  switch (sourceType) {
    case 'txt':
    case 'md':
      ({ text, title } = await parseTextFile(filePath, sourceType === 'md' ? 'text/markdown' : 'text/plain'));
      break;
    case 'html':
      ({ text, title } = await parseHtmlFile(filePath));
      break;
    case 'pdf':
      ({ text, title } = await parsePdfFile(filePath));
      break;
    case 'docx':
      ({ text, title } = await parseDocxFile(filePath));
      break;
    default:
      throw new Error(`Unsupported file type: ${sourceType}`);
  }

  // Use provided title if available
  if (metadata?.title) {
    title = metadata.title;
  }

  // Get file stats
  const stats = await fs.stat(filePath);

  // Create chunks
  const chunks = chunkText(text, documentId, {
    sourceType,
    url: metadata?.url,
    title,
  });

  // Create document metadata
  const docMetadata: DocumentMetadata = {
    id: documentId,
    type: sourceType,
    filename: path.basename(filePath),
    url: metadata?.url,
    title,
    size: stats.size,
    uploadedAt: Date.now(),
    chunkCount: chunks.length,
    path: filePath,
  };

  return { metadata: docMetadata, chunks };
}

/**
 * Process a tab snapshot
 */
export async function ingestSnapshot(
  snapshotPath: string,
  documentId: string,
  metadata: { url: string; title: string; tabId: string }
): Promise<{ metadata: DocumentMetadata; chunks: DocumentChunk[] }> {
  // Read snapshot data
  const snapshotData = JSON.parse(await fs.readFile(snapshotPath, 'utf-8'));
  
  // Parse HTML content
  const { text, title } = await parseHtmlFile(snapshotPath);
  
  // Use snapshot metadata
  const finalTitle = metadata.title || snapshotData.title || title;
  
  // Create chunks
  const chunks = chunkText(text, documentId, {
    sourceType: 'tab',
    url: metadata.url,
    title: finalTitle,
  });

  // Get file stats
  const stats = await fs.stat(snapshotPath);

  // Create document metadata
  const docMetadata: DocumentMetadata = {
    id: documentId,
    type: 'tab',
    url: metadata.url,
    title: finalTitle,
    size: stats.size,
    uploadedAt: snapshotData.capturedAt || Date.now(),
    chunkCount: chunks.length,
    path: snapshotPath,
  };

  return { metadata: docMetadata, chunks };
}

/**
 * Save chunks to storage
 */
export async function saveChunks(chunks: DocumentChunk[]): Promise<void> {
  const chunksDir = path.join(app.getPath('userData'), 'research', 'chunks');
  await fs.mkdir(chunksDir, { recursive: true });

  // Save each chunk as a separate file for easy retrieval
  await Promise.all(
    chunks.map(async (chunk) => {
      const chunkPath = path.join(chunksDir, `${chunk.id}.json`);
      await fs.writeFile(chunkPath, JSON.stringify(chunk, null, 2), 'utf-8');
    })
  );
}

/**
 * Save document metadata
 */
export async function saveDocumentMetadata(metadata: DocumentMetadata): Promise<void> {
  const metadataDir = path.join(app.getPath('userData'), 'research', 'documents');
  await fs.mkdir(metadataDir, { recursive: true });

  const metadataPath = path.join(metadataDir, `${metadata.id}.json`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
  try {
    const metadataPath = path.join(app.getPath('userData'), 'research', 'documents', `${documentId}.json`);
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get chunks for a document
 */
export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  try {
    const chunksDir = path.join(app.getPath('userData'), 'research', 'chunks');
    const files = await fs.readdir(chunksDir);
    
    const chunkFiles = files.filter(f => f.startsWith(`${documentId}-chunk-`) && f.endsWith('.json'));
    const chunks = await Promise.all(
      chunkFiles.map(async (file) => {
        const content = await fs.readFile(path.join(chunksDir, file), 'utf-8');
        return JSON.parse(content) as DocumentChunk;
      })
    );

    // Sort by chunk index
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch {
    return [];
  }
}

/**
 * List all documents
 */
export async function listDocuments(): Promise<DocumentMetadata[]> {
  try {
    const metadataDir = path.join(app.getPath('userData'), 'research', 'documents');
    const files = await fs.readdir(metadataDir);
    
    const metadataFiles = files.filter(f => f.endsWith('.json'));
    const documents = await Promise.all(
      metadataFiles.map(async (file) => {
        const content = await fs.readFile(path.join(metadataDir, file), 'utf-8');
        return JSON.parse(content) as DocumentMetadata;
      })
    );

    // Sort by upload date (newest first)
    return documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch {
    return [];
  }
}

