/**
 * Scraper API
 * REST endpoints for the scraper engine
 */

const express = require('express');
const { getScraperEngine } = require('./scraper-engine.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'scraper-api' });
const router = express.Router();

/**
 * POST /api/scraper/scrape
 * Scrape a single URL
 */
router.post('/scrape', async (req, res) => {
  const { url, options } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL required',
    });
  }

  try {
    const scraper = getScraperEngine();
    const result = await scraper.scrape(url, options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error({ url, error: error.message }, 'Scrape API error');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/scraper/summarize
 * Summarize scraped content
 */
router.post('/summarize', async (req, res) => {
  const { content, options } = req.body;

  if (!content) {
    return res.status(400).json({
      error: 'Content required',
    });
  }

  try {
    const scraper = getScraperEngine();
    const result = await scraper.summarize(content, options);

    res.json(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Summarize API error');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/scraper/research
 * Process research query (scrape multiple URLs and synthesize)
 */
router.post('/research', async (req, res) => {
  const { query, urls, options } = req.body;

  if (!query || !urls || !Array.isArray(urls)) {
    return res.status(400).json({
      error: 'Query and urls array required',
    });
  }

  try {
    const scraper = getScraperEngine();
    const result = await scraper.processResearchQuery(query, urls, options);

    res.json(result);
  } catch (error) {
    logger.error({ query, error: error.message }, 'Research API error');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scraper/stats
 * Get scraper statistics
 */
router.get('/stats', (req, res) => {
  try {
    const scraper = getScraperEngine();
    const stats = scraper.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error({ error: error.message }, 'Stats API error');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scraper/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'scraper-engine',
    browserType: require('./scraper-engine.cjs').getScraperEngine().browser ? 'initialized' : 'not-initialized',
    timestamp: Date.now(),
  });
});

module.exports = router;








