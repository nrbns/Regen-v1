/**
 * IndexedDB Store for Offline Documents
 * Stores web pages, documents, and research content for offline RAG
 */

import Dexie, { type Table } from 'dexie';

export interface StoredDocument {
  id: string;
  url: string;
  title: string;
  content: string; // Full text content
  excerpt?: string; // Short excerpt
  html?: string; // Original HTML (optional, for rendering)
  metadata?: {
    author?: string;
    publishedAt?: string;
    tags?: string[];
    language?: string;
    wordCount?: number;
    sourceType?: 'web' | 'research' | 'uploaded' | 'offline';
  };
  chunks?: DocumentChunk[]; // Text chunks for RAG
  embeddings?: number[]; // Vector embeddings (optional)
  embeddingModel?: string; // Model used for embeddings
  embeddingDimension?: number; // Embedding dimension
  indexedAt: number; // Timestamp when indexed
  accessedAt: number; // Last access timestamp
  accessCount: number; // How many times accessed
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  startIndex: number; // Character offset in original text
  endIndex: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  document: StoredDocument;
  score: number;
  matchedChunks?: DocumentChunk[];
  highlights?: string[]; // Highlighted snippets
}

/**
 * IndexedDB database for offline document storage
 */
class OfflineDocumentDB extends Dexie {
  documents!: Table<StoredDocument>;
  chunks!: Table<DocumentChunk>;

  constructor() {
    super('RegenOfflineStore');

    // Define schema
    this.version(1).stores({
      documents: 'id, url, title, indexedAt, accessedAt, *metadata.tags',
      chunks: 'id, documentId, startIndex',
    });

    // Add indexes for faster queries
    this.version(2).stores({
      documents: 'id, url, title, indexedAt, accessedAt, *metadata.tags, [indexedAt+accessedAt]',
      chunks: 'id, documentId, startIndex, [documentId+startIndex]',
    });
  }
}

// Singleton instance
let dbInstance: OfflineDocumentDB | null = null;

export function getOfflineDB(): OfflineDocumentDB {
  if (!dbInstance) {
    dbInstance = new OfflineDocumentDB();
  }
  return dbInstance;
}

/**
 * Store a document in IndexedDB
 */
export async function storeDocument(
  document: Omit<StoredDocument, 'indexedAt' | 'accessedAt' | 'accessCount'>
): Promise<string> {
  const db = getOfflineDB();

  const now = Date.now();
  const doc: StoredDocument = {
    ...document,
    indexedAt: now,
    accessedAt: now,
    accessCount: 0,
  };

  // Check if document already exists (by URL)
  const existing = await db.documents.where('url').equals(document.url).first();
  if (existing) {
    // Update existing document
    await db.documents.update(existing.id, {
      ...doc,
      indexedAt: existing.indexedAt, // Keep original index time
    });
    return existing.id;
  }

  // Store chunks if provided
  if (doc.chunks && doc.chunks.length > 0) {
    await db.chunks.bulkPut(doc.chunks);
  }

  // Store document
  await db.documents.add(doc);
  return doc.id;
}

/**
 * Retrieve a document by ID or URL
 */
export async function getDocument(idOrUrl: string): Promise<StoredDocument | undefined> {
  const db = getOfflineDB();

  // Try by ID first
  const byId = await db.documents.get(idOrUrl);
  if (byId) {
    // Update access stats
    await db.documents.update(idOrUrl, {
      accessedAt: Date.now(),
      accessCount: (byId.accessCount || 0) + 1,
    });

    // Load chunks
    const chunks = await db.chunks.where('documentId').equals(idOrUrl).toArray();
    return { ...byId, chunks };
  }

  // Try by URL
  const byUrl = await db.documents.where('url').equals(idOrUrl).first();
  if (byUrl) {
    await db.documents.update(byUrl.id, {
      accessedAt: Date.now(),
      accessCount: (byUrl.accessCount || 0) + 1,
    });

    const chunks = await db.chunks.where('documentId').equals(byUrl.id).toArray();
    return { ...byUrl, chunks };
  }

  return undefined;
}

/**
 * List all documents
 */
export async function listDocuments(
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'indexedAt' | 'accessedAt' | 'accessCount';
    order?: 'asc' | 'desc';
  } = {}
): Promise<StoredDocument[]> {
  const db = getOfflineDB();

  const { limit = 50, offset = 0, sortBy = 'indexedAt', order = 'desc' } = options;

  let query = db.documents.orderBy(sortBy);
  if (order === 'desc') {
    query = query.reverse();
  }

  const docs = await query.offset(offset).limit(limit).toArray();

  // Load chunks for each document
  const docsWithChunks = await Promise.all(
    docs.map(async doc => {
      const chunks = await db.chunks.where('documentId').equals(doc.id).toArray();
      return { ...doc, chunks };
    })
  );

  return docsWithChunks;
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const db = getOfflineDB();

  // Delete chunks first
  await db.chunks.where('documentId').equals(id).delete();

  // Delete document
  await db.documents.delete(id);
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  const db = getOfflineDB();
  return db.documents.count();
}

/**
 * Get storage size estimate (approximate)
 */
export async function getStorageSize(): Promise<number> {
  const db = getOfflineDB();
  const docs = await db.documents.toArray();

  // Estimate size (rough calculation)
  let totalSize = 0;
  for (const doc of docs) {
    totalSize += JSON.stringify(doc).length;
  }

  const chunks = await db.chunks.toArray();
  for (const chunk of chunks) {
    totalSize += JSON.stringify(chunk).length;
  }

  return totalSize;
}

/**
 * Clear all stored documents (use with caution)
 */
export async function clearAllDocuments(): Promise<void> {
  const db = getOfflineDB();
  await db.transaction('rw', db.documents, db.chunks, async () => {
    await db.chunks.clear();
    await db.documents.clear();
  });
}
