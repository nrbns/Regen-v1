/* eslint-env node */
/**
 * Vector Store Integration
 * Handles embeddings, chunking, and semantic search
 * Supports pgvector (PostgreSQL) and fallback to in-memory for development
 */

// import { detectLanguage } from '../lang/detect.js'; // Reserved for future use

/**
 * Chunk text into semantic chunks
 * Uses sentence boundaries and size limits
 */
export function chunkText(text, options = {}) {
  const { maxChunkSize = 800, overlap = 100, minChunkSize = 200 } = options;

  // Split by sentences first
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  const chunks = [];
  let currentChunk = '';
  let currentSize = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.split(/\s+/).length;

    if (currentSize + sentenceSize > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        size: currentSize,
        chunkIdx: chunks.length,
        startIndex: chunks.length * (maxChunkSize - overlap),
      });

      // Start new chunk with overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-overlap);
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
      currentSize = overlapWords.length + sentenceSize;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentSize += sentenceSize;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      size: currentSize,
      chunkIdx: chunks.length,
      startIndex: chunks.length * (maxChunkSize - overlap),
    });
  }

  return chunks;
}

/**
 * Create embeddings for text chunks
 * Uses OpenAI embeddings API or falls back to simple TF-IDF-like vectors
 */
export async function createEmbeddings(texts, options = {}) {
  const { model = 'text-embedding-3-small' } = options;

  // Try OpenAI embeddings if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: texts,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.map(item => item.embedding);
      }
    } catch (error) {
      console.warn('[VectorStore] OpenAI embeddings failed, using fallback:', error.message);
    }
  }

  // Fallback: simple TF-IDF-like vectors (for development/testing)
  return createSimpleEmbeddings(texts);
}

/**
 * Simple embedding fallback using word frequency vectors
 * Not as good as real embeddings but works for development
 */
function createSimpleEmbeddings(texts) {
  // Build vocabulary
  const vocab = new Set();
  const tokenized = texts.map(text => {
    const tokens = text
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);
    tokens.forEach(t => vocab.add(t));
    return tokens;
  });

  const vocabArray = Array.from(vocab);
  const vocabIndex = new Map(vocabArray.map((v, i) => [v, i]));

  // Create TF-IDF vectors
  const docFreq = new Map();
  tokenized.forEach(tokens => {
    const unique = new Set(tokens);
    unique.forEach(t => {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    });
  });

  const embeddings = tokenized.map(tokens => {
    const vector = new Array(vocabArray.length).fill(0);
    const termFreq = new Map();

    tokens.forEach(t => {
      termFreq.set(t, (termFreq.get(t) || 0) + 1);
    });

    tokens.forEach(t => {
      const idx = vocabIndex.get(t);
      if (idx !== undefined) {
        const tf = termFreq.get(t) / tokens.length;
        const idf = Math.log(texts.length / (docFreq.get(t) || 1));
        vector[idx] = tf * idf;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  });

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic search: find most relevant chunks for a query
 */
export async function semanticSearch(query, chunks, options = {}) {
  const { topK = 12, minScore = 0.3 } = options;

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Create query embedding
  const queryEmbeddings = await createEmbeddings([query]);
  const queryVector = queryEmbeddings[0];

  // Score each chunk
  const scored = await Promise.all(
    chunks.map(async (chunk, idx) => {
      // Get or create chunk embedding
      let chunkVector = chunk.embedding;

      if (!chunkVector) {
        const embeddings = await createEmbeddings([chunk.content]);
        chunkVector = embeddings[0];
        chunk.embedding = chunkVector; // Cache it
      }

      // Calculate semantic similarity
      const semanticScore = cosineSimilarity(queryVector, chunkVector);

      // Combine with lexical score (simple keyword matching)
      const queryWords = new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 2)
      );
      const chunkWords = new Set(chunk.content.toLowerCase().split(/\s+/));
      const overlap = [...queryWords].filter(w => chunkWords.has(w)).length;
      const lexicalScore = overlap / queryWords.size;

      // Weighted combination
      const combinedScore = 0.7 * semanticScore + 0.3 * lexicalScore;

      return {
        ...chunk,
        index: idx,
        semanticScore,
        lexicalScore,
        score: combinedScore,
      };
    })
  );

  // Filter and sort
  return scored
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Upsert chunks to vector store
 * For now, stores in memory. Can be extended to pgvector/Weaviate
 */
const chunkStore = new Map(); // In-memory store for development

export async function upsertChunks(jobId, chunks) {
  // Create embeddings for chunks
  const texts = chunks.map(c => c.content);
  const embeddings = await createEmbeddings(texts);

  // Store chunks with embeddings
  const enrichedChunks = chunks.map((chunk, idx) => ({
    ...chunk,
    embedding: embeddings[idx],
    jobId,
    storedAt: Date.now(),
  }));

  // Store in memory (replace with DB upsert in production)
  const existing = chunkStore.get(jobId) || [];
  chunkStore.set(jobId, [...existing, ...enrichedChunks]);

  return enrichedChunks;
}

/**
 * Retrieve chunks for a job
 */
export function getChunksForJob(jobId) {
  return chunkStore.get(jobId) || [];
}

/**
 * Clear chunks for a job (cleanup)
 */
export function clearChunksForJob(jobId) {
  chunkStore.delete(jobId);
}
