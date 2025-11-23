/* eslint-env node */
import { redisClient } from '../../config/redis.js';
import { fetchWithSafety } from './scraper.js';

export async function handleScrapeJob(data) {
  const startedAt = Date.now();
  const result = await fetchWithSafety(data.url);

  const record = {
    jobId: data.jobId,
    url: data.url,
    status: result.status,
    allowed: result.allowed,
    reason: result.reason || null,
    cached: Boolean(result.cached),
    fetchedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  if (result.headers) {
    record.headers = result.headers;
  }

  if (result.body) {
    const bodyKey = `scrape:body:${record.jobId}`;
    await redisClient.set(
      bodyKey,
      result.body,
      'EX',
      Number(process.env.SCRAPE_BODY_TTL || 60 * 30)
    );
    record.bodyKey = bodyKey;
  }

  const metaKey = `scrape:meta:${record.jobId}`;
  await redisClient.set(
    metaKey,
    JSON.stringify(record),
    'EX',
    Number(process.env.SCRAPE_META_TTL || 60 * 60)
  );

  return record;
}
