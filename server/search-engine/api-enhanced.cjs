/**
 * Enhanced Search API
 * Production-grade search endpoints with RAG pipeline, streaming, and keyset pagination
 */

const express = require('express');
const { getRAGPipeline } = require('./rag-pipeline.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'search-api-enhanced' });
const router = express.Router();

/**
 * Keyset pagination helpers
 */
function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(token) {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString());
  } catch {
    return null;
  }
}

/**
 * POST /api/search/query
 * Search with RAG pipeline
 */
router.post('/query', async (req, res) => {
  const { query, limit = 10, cursor, scoreThreshold = 0.5 } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Query required',
    });
  }

  try {
    const pipeline = getRAGPipeline();
    const results = await pipeline.search(query, {
      limit: limit + 1, // Fetch one extra for cursor
      scoreThreshold,
    });

    // Keyset pagination
    const hasMore = results.results.length > limit;
    const items = results.results.slice(0, limit);
    
    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        lastScore: lastItem.score,
        lastId: lastItem.id,
        query,
      });
    }

    res.json({
      query,
      results: items,
      count: items.length,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    logger.error({ query, error: error.message }, 'Search failed');
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/search/stream
 * Streaming search with RAG synthesis
 */
router.post('/stream', async (req, res) => {
  const { query, limit = 10 } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Query required',
    });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const pipeline = getRAGPipeline();
    
    // 1. Search
    const searchResults = await pipeline.search(query, { limit });
    
    // Send sources first
    res.write(`data: ${JSON.stringify({ type: 'sources', sources: searchResults.results })}\n\n`);

    // 2. Synthesize with streaming
    await pipeline.synthesize(query, searchResults.results, (token) => {
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
    });

    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    logger.error({ query, error: error.message }, 'Streaming search failed');
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/search/index
 * Index a document
 */
router.post('/index', async (req, res) => {
  const { url, html, metadata } = req.body;

  if (!url || !html) {
    return res.status(400).json({
      error: 'URL and HTML required',
    });
  }

  try {
    const pipeline = getRAGPipeline();
    const result = await pipeline.indexDocument(url, html, metadata || {});
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error({ url, error: error.message }, 'Indexing failed');
    res.status(500).json({
      error: 'Indexing failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/search/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const pipeline = getRAGPipeline();
    const qdrantInfo = await pipeline.qdrant.getInfo();
    
    res.json({
      status: 'ok',
      qdrant: qdrantInfo ? 'connected' : 'disconnected',
      storage: pipeline.storage.initialized ? 'connected' : 'disconnected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

module.exports = router;








