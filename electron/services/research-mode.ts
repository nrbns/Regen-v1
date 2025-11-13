/**
 * Research Mode Service
 * Handles document capture, ingestion, vector search, and streaming queries
 */

import { ipcMain, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// In-memory storage for snapshots and documents (MVP - should move to DB)
const snapshots = new Map<string, {
  id: string;
  url: string;
  title: string;
  html: string;
  text: string;
  createdAt: number;
  tabId?: string;
}>();

const documents = new Map<string, {
  id: string;
  filename: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  text: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}>();

// Simple in-memory vector store (MVP - should use proper vector DB)
interface VectorChunk {
  id: string;
  documentId: string;
  documentType: 'snapshot' | 'file';
  text: string;
  embedding?: number[];
  metadata: {
    url?: string;
    title?: string;
    page?: number;
    charRange?: [number, number];
  };
}

const vectorChunks = new Map<string, VectorChunk>();

// Simple text-based search (MVP - should use embeddings)
function searchChunks(query: string, topK: number = 10): VectorChunk[] {
  const queryLower = query.toLowerCase();
  const terms = queryLower.split(/\s+/).filter(Boolean);
  
  const scored = Array.from(vectorChunks.values()).map((chunk) => {
    const textLower = chunk.text.toLowerCase();
    const score = terms.reduce((acc, term) => {
      const count = (textLower.match(new RegExp(term, 'g')) || []).length;
      return acc + count;
    }, 0);
    return { chunk, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
  
  return scored;
}

// Simple chunking function
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start = end - overlap;
  }
  
  return chunks;
}

// Extract readable content from tab
async function extractTabContent(win: BrowserWindow, _tabId?: string): Promise<{ html: string; text: string; title: string; url: string } | null> {
  try {
    const views = win.getBrowserViews();
    const view = views.length > 0 ? views[views.length - 1] : null;
    
    if (!view) {
      return null;
    }

    const webContents = view.webContents;
    const url = webContents.getURL();
    
    if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
      return null;
    }

    // Wait for page to be ready
    if (webContents.isLoading()) {
      await new Promise<void>((resolve) => {
        const onFinish = () => {
          webContents.off('did-finish-load', onFinish);
          webContents.off('did-fail-load', onFinish);
          resolve();
        };
        webContents.once('did-finish-load', onFinish);
        webContents.once('did-fail-load', onFinish);
        setTimeout(() => onFinish(), 5000);
      });
    }

    const [html, title] = await Promise.all([
      webContents.executeJavaScript(`
        (() => {
          try {
            const doc = document.cloneNode(true);
            Array.from(doc.querySelectorAll('script, style, noscript, iframe, embed, object, svg')).forEach(el => el.remove());
            return doc.documentElement.outerHTML;
          } catch(e) {
            return document.documentElement.outerHTML;
          }
        })()
      `, true).catch(() => ''),
      webContents.executeJavaScript('document.title || document.querySelector("title")?.textContent || ""', true).catch(() => ''),
    ]);

    if (!html) {
      return null;
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      const bodyText = dom.window.document.body?.textContent || '';
      return { html, text: bodyText, title: title || url, url };
    }

    return {
      html: article.content || html,
      text: article.textContent || '',
      title: article.title || title || url,
      url,
    };
  } catch (error) {
    console.error('Failed to extract tab content:', error);
    return null;
  }
}

export function registerResearchModeIpc() {
  // Save tab snapshot
  registerHandler('researchMode:saveSnapshot', z.object({
    tabId: z.string().optional(),
    url: z.string(),
    title: z.string(),
  }), async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (!win) {
      return { success: false, error: 'No window found' };
    }

    try {
      const content = await extractTabContent(win, request.tabId);
      if (!content) {
        return { success: false, error: 'Failed to extract content' };
      }

      const snapshotId = randomUUID();
      const snapshot = {
        id: snapshotId,
        url: request.url,
        title: request.title || content.title,
        html: content.html,
        text: content.text,
        createdAt: Date.now(),
        tabId: request.tabId,
      };

      snapshots.set(snapshotId, snapshot);

      // Chunk and index
      const chunks = chunkText(content.text);
      chunks.forEach((chunkText, idx) => {
        const chunkId = `${snapshotId}-chunk-${idx}`;
        vectorChunks.set(chunkId, {
          id: chunkId,
          documentId: snapshotId,
          documentType: 'snapshot',
          text: chunkText,
          metadata: {
            url: request.url,
            title: snapshot.title,
            charRange: [idx * 500, (idx + 1) * 500],
          },
        });
      });

      return { success: true, snapshotId };
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Upload file
  registerHandler('researchMode:uploadFile', z.object({
    filename: z.string(),
    buffer: z.union([z.instanceof(Buffer), z.instanceof(Uint8Array), z.any()]),
    mimeType: z.string().optional(),
  }), async (_event, request) => {
    try {
      const fileId = randomUUID();
      const ext = path.extname(request.filename).toLowerCase();
      let text = '';
      let type: 'pdf' | 'docx' | 'txt' | 'md' = 'txt';
      
      // Convert to Buffer if needed
      const buffer = Buffer.isBuffer(request.buffer) 
        ? request.buffer 
        : Buffer.from(new Uint8Array(request.buffer as ArrayBuffer | Uint8Array));

      if (ext === '.pdf') {
        type = 'pdf';
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else if (ext === '.docx') {
        type = 'docx';
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (ext === '.md') {
        type = 'md';
        text = buffer.toString('utf-8');
      } else {
        type = 'txt';
        text = buffer.toString('utf-8');
      }

      const document = {
        id: fileId,
        filename: request.filename,
        type,
        text,
        metadata: {
          mimeType: request.mimeType,
          size: buffer.length,
        },
        createdAt: Date.now(),
      };

      documents.set(fileId, document);

      // Chunk and index
      const chunks = chunkText(text);
      chunks.forEach((chunkText, idx) => {
        const chunkId = `${fileId}-chunk-${idx}`;
        vectorChunks.set(chunkId, {
          id: chunkId,
          documentId: fileId,
          documentType: 'file',
          text: chunkText,
          metadata: {
            title: request.filename,
            page: type === 'pdf' ? Math.floor(idx / 3) + 1 : undefined,
            charRange: [idx * 500, (idx + 1) * 500],
          },
        });
      });

      return { success: true, fileId };
    } catch (error) {
      console.error('Failed to upload file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Query with streaming
  registerHandler('researchMode:query', z.object({
    query: z.string(),
    workspaceId: z.string().optional(),
    topK: z.number().optional(),
  }), async (_event, request) => {
    try {
      const topK = request.topK || 10;
      const chunks = searchChunks(request.query, topK);

      // Group chunks by document
      const documentMap = new Map<string, VectorChunk[]>();
      chunks.forEach((chunk) => {
        if (!documentMap.has(chunk.documentId)) {
          documentMap.set(chunk.documentId, []);
        }
        documentMap.get(chunk.documentId)!.push(chunk);
      });

      // Build sources
      const sources = Array.from(documentMap.entries()).map(([docId, docChunks]) => {
        const snapshot = snapshots.get(docId);
        const document = documents.get(docId);
        
        if (snapshot) {
          return {
            id: docId,
            title: snapshot.title,
            url: snapshot.url,
            snippet: docChunks[0]?.text.slice(0, 200) || '',
            type: 'snapshot' as const,
            confidence: 0.8,
          };
        } else if (document) {
          return {
            id: docId,
            title: document.filename,
            url: `file://${docId}`,
            snippet: docChunks[0]?.text.slice(0, 200) || '',
            type: document.type === 'pdf' ? 'pdf' as const : 'file' as const,
            confidence: 0.8,
            page: docChunks[0]?.metadata.page,
          };
        }
        return null;
      }).filter(Boolean) as any[];

      // Simple answer generation (MVP - should use LLM)
      const answer = chunks
        .slice(0, 3)
        .map((chunk) => chunk.text)
        .join(' ')
        .slice(0, 500) + '...';

      // Create streaming channel
      const streamChannel = `research:stream:${randomUUID()}`;

      // Simulate streaming (MVP - should use real SSE/WebSocket)
      const eventSender = _event.sender;
      setTimeout(() => {
        const words = answer.split(' ');
        // let _currentText = '';
        
        words.forEach((word, idx) => {
          setTimeout(() => {
            // _currentText += (idx > 0 ? ' ' : '') + word;
            if (ipcMain.listenerCount(streamChannel) > 0) {
              eventSender.send(streamChannel, {
                type: 'chunk',
                content: word + (idx < words.length - 1 ? ' ' : ''),
                citations: idx % 3 === 0 ? [sources[0]?.id] : [],
              });
            }
            
            if (idx === words.length - 1) {
              setTimeout(() => {
                eventSender.send(streamChannel, {
                  type: 'sources',
                  sources,
                });
                eventSender.send(streamChannel, {
                  type: 'complete',
                });
              }, 100);
            }
          }, idx * 50);
        });
      }, 100);

      return {
        streamChannel,
        answer, // Fallback for non-streaming clients
        sources,
      };
    } catch (error) {
      console.error('Research query failed:', error);
      return {
        streamChannel: null,
        answer: '',
        sources: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get snapshot
  registerHandler('researchMode:getSnapshot', z.object({
    snapshotId: z.string(),
  }), async (_event, request) => {
    const snapshot = snapshots.get(request.snapshotId);
    if (!snapshot) {
      return { success: false, error: 'Snapshot not found' };
    }
    return { success: true, snapshot };
  });

  // List documents
  registerHandler('researchMode:listDocuments', z.object({}), async () => {
    const snapshotList = Array.from(snapshots.values()).map((s) => ({
      id: s.id,
      type: 'snapshot' as const,
      title: s.title,
      url: s.url,
      createdAt: s.createdAt,
    }));

    const documentList = Array.from(documents.values()).map((d) => ({
      id: d.id,
      type: d.type,
      title: d.filename,
      createdAt: d.createdAt,
    }));

    return {
      snapshots: snapshotList,
      documents: documentList,
    };
  });
}

