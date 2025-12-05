/**
 * Embedding Pipeline for SuperMemory
 * Generates and stores vector embeddings for semantic search
 */
import { MemoryStoreInstance } from './store';
import { generateEmbeddingVector } from './embeddingService';
// Simple embedding cache (in production, use IndexedDB or vector DB)
const embeddingCache = new Map();
// Chunk size for text splitting
const CHUNK_SIZE = 512; // tokens/characters
const CHUNK_OVERLAP = 50;
/**
 * Split text into chunks for embedding
 */
export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    if (text.length <= chunkSize) {
        return [text];
    }
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);
        // Try to break at sentence boundaries
        if (end < text.length) {
            const lastPeriod = chunk.lastIndexOf('.');
            const lastNewline = chunk.lastIndexOf('\n');
            const breakPoint = Math.max(lastPeriod, lastNewline);
            if (breakPoint > chunkSize * 0.5) {
                chunk = text.slice(start, start + breakPoint + 1);
                start += breakPoint + 1;
            }
            else {
                start = end - overlap;
            }
        }
        else {
            start = end;
        }
        chunks.push(chunk.trim());
    }
    return chunks.filter(chunk => chunk.length > 0);
}
/**
 * Generate embedding for text using Hugging Face API (with fallback)
 * Uses Hugging Face Inference API for semantic embeddings
 */
export async function generateEmbedding(text) {
    return generateEmbeddingVector(text);
}
/**
 * Generate and store embeddings for a memory event
 */
export async function embedMemoryEvent(event) {
    const embeddingIds = [];
    try {
        // Extract text to embed based on event type
        let textToEmbed = '';
        if (event.type === 'search') {
            textToEmbed = event.value; // Search query
        }
        else if (event.type === 'visit') {
            textToEmbed = `${event.metadata?.title || ''} ${event.value}`.trim(); // Page title + URL
        }
        else if (event.type === 'note') {
            textToEmbed = event.value; // Note content
        }
        else {
            textToEmbed = event.value || JSON.stringify(event.metadata || {});
        }
        if (!textToEmbed || textToEmbed.length < 10) {
            return embeddingIds; // Skip very short text
        }
        // Chunk text if needed
        const chunks = chunkText(textToEmbed);
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const vector = await generateEmbedding(chunk);
            const embedding = {
                id: `${event.id}-chunk-${i}`,
                eventId: event.id,
                vector,
                text: chunk,
                metadata: {
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    eventType: event.type,
                    ...event.metadata,
                },
                timestamp: event.ts,
            };
            // Store in cache
            embeddingCache.set(embedding.id, embedding);
            // Store in IndexedDB (enhanced database)
            try {
                const { superMemoryDB } = await import('./db');
                await superMemoryDB.saveEmbedding({
                    id: embedding.id,
                    eventId: embedding.eventId,
                    vector: embedding.vector,
                    text: embedding.text,
                    metadata: embedding.metadata,
                    timestamp: embedding.timestamp,
                });
            }
            catch (error) {
                // Fallback to localStorage
                console.warn('[Embedding] Failed to save to IndexedDB, using localStorage:', error);
                MemoryStoreInstance.set(`embedding:${embedding.id}`, embedding);
            }
            embeddingIds.push(embedding.id);
        }
    }
    catch (error) {
        console.error('[Embedding] Failed to embed memory event:', error);
    }
    return embeddingIds;
}
/**
 * Search embeddings by similarity
 */
export async function searchEmbeddings(query, limit = 10) {
    try {
        // Generate query embedding
        const queryVector = await generateEmbedding(query);
        // Get all embeddings from store
        const allEmbeddings = [];
        // Load from cache first
        for (const embedding of embeddingCache.values()) {
            allEmbeddings.push(embedding);
        }
        // Load from IndexedDB (enhanced database)
        try {
            const { superMemoryDB } = await import('./db');
            const dbEmbeddings = await superMemoryDB.getAllEmbeddings(1000);
            for (const dbEmbedding of dbEmbeddings) {
                const embedding = {
                    id: dbEmbedding.id,
                    eventId: dbEmbedding.eventId,
                    vector: dbEmbedding.vector,
                    text: dbEmbedding.text,
                    metadata: dbEmbedding.metadata,
                    timestamp: dbEmbedding.timestamp,
                };
                if (!embeddingCache.has(embedding.id)) {
                    embeddingCache.set(embedding.id, embedding);
                    allEmbeddings.push(embedding);
                }
            }
        }
        catch (error) {
            // Fallback to localStorage
            console.warn('[Embedding] Failed to load from IndexedDB, using localStorage:', error);
            const storedEvents = await MemoryStoreInstance.getEvents({ limit: 1000 });
            for (const event of storedEvents) {
                try {
                    const embedding = MemoryStoreInstance.get(`embedding:${event.id}-chunk-0`);
                    if (embedding && !embeddingCache.has(embedding.id)) {
                        embeddingCache.set(embedding.id, embedding);
                        allEmbeddings.push(embedding);
                    }
                }
                catch {
                    // Skip if embedding doesn't exist
                }
            }
        }
        // Calculate cosine similarity
        const results = allEmbeddings.map(embedding => {
            const similarity = cosineSimilarity(queryVector, embedding.vector);
            return { embedding, similarity };
        });
        // Sort by similarity and return top results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, limit);
    }
    catch (error) {
        console.error('[Embedding] Failed to search embeddings:', error);
        return [];
    }
}
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
/**
 * Batch embed multiple events
 */
export async function batchEmbedEvents(events) {
    for (const event of events) {
        await embedMemoryEvent(event);
    }
}
/**
 * Clear embeddings for an event
 */
export async function clearEventEmbeddings(eventId) {
    // Find all embeddings for this event
    const toDelete = [];
    for (const [id, embedding] of embeddingCache.entries()) {
        if (embedding.eventId === eventId) {
            toDelete.push(id);
        }
    }
    // Delete from cache and store
    for (const id of toDelete) {
        embeddingCache.delete(id);
        MemoryStoreInstance.set(`embedding:${id}`, null); // Clear from store
    }
}
