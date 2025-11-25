/* eslint-env node */
import fetch from 'node-fetch';
import AbortControllerPkg from 'abort-controller';
import robotsParser from 'robots-parser';
import pTimeout from 'p-timeout';
import { redisClient } from '../../config/redis.js';
import { createCircuit } from '../circuit/circuit.js';

const AbortControllerImpl = globalThis.AbortController || AbortControllerPkg;

const SCRAPER_USER_AGENT = process.env.SCRAPER_USER_AGENT || 'RegenBot/1.0 (+https://regen.ai/bot)';
const CACHE_TTL_SECONDS = Number(process.env.SCRAPER_CACHE_TTL || 60 * 5);
const ROBOTS_TTL_SECONDS = Number(process.env.SCRAPER_ROBOTS_TTL || 60 * 60);
const REQUEST_TIMEOUT = Number(process.env.SCRAPER_TIMEOUT_MS || 10_000);
const PER_DOMAIN_RPS = Number(process.env.SCRAPER_RPS || 2);
const IGNORE_ROBOTS = process.env.SCRAPER_IGNORE_ROBOTS === '1';

async function getRobots(domain, protocol) {
  const key = `robots:${domain}`;
  const cached = await redisClient.get(key);
  if (cached !== null) {
    return cached;
  }
  const robotsUrl = `${protocol}//${domain}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      headers: { 'user-agent': SCRAPER_USER_AGENT },
      timeout: 3000,
    });
    const text = await res.text();
    await redisClient.set(key, text, 'EX', ROBOTS_TTL_SECONDS);
    return text;
  } catch (error) {
    console.warn('[scraper] failed to fetch robots', robotsUrl, error?.message || error);
    await redisClient.set(key, '', 'EX', ROBOTS_TTL_SECONDS);
    return '';
  }
}

async function allowRequest(domain) {
  const bucketKey = `scrape:rate:${domain}:${Math.floor(Date.now() / 1000)}`;
  const current = await redisClient.incr(bucketKey);
  if (current === 1) {
    await redisClient.expire(bucketKey, 1);
  }
  return current <= PER_DOMAIN_RPS;
}

const fetchCircuit = createCircuit(
  async (url, options) => {
    const controller = new AbortControllerImpl();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'user-agent': SCRAPER_USER_AGENT,
          ...(options?.headers || {}),
        },
      });
      const body = await response.text();
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      };
    } finally {
      clearTimeout(timer);
    }
  },
  {
    timeout: REQUEST_TIMEOUT + 1000,
  }
);

export async function fetchWithSafety(rawUrl) {
  const url = new URL(rawUrl);
  const domain = url.hostname;

  if (!IGNORE_ROBOTS) {
    const robotsTxt = await getRobots(domain, url.protocol);
    const robots = robotsParser(`${url.protocol}//${domain}/robots.txt`, robotsTxt);
    if (robots && !robots.isAllowed(rawUrl, SCRAPER_USER_AGENT)) {
      return { allowed: false, status: 403, reason: 'robots_disallow' };
    }
  }

  const allowed = await allowRequest(domain);
  if (!allowed) {
    return { allowed: false, status: 429, reason: 'rate_limited' };
  }

  const cacheKey = `scrape:cache:${rawUrl}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return { allowed: true, status: 200, body: cached, cached: true };
  }

  try {
    const result = await pTimeout(fetchCircuit.fire(rawUrl, {}), {
      milliseconds: REQUEST_TIMEOUT + 2000,
      onTimeout: () => {
        const error = new Error('scrape-timeout');
        error.code = 'SCRAPE_TIMEOUT';
        throw error;
      },
    });

    if (result.body) {
      await redisClient.set(cacheKey, result.body, 'EX', CACHE_TTL_SECONDS);
    }

    return {
      allowed: true,
      status: result.status,
      body: result.body,
      headers: result.headers,
      cached: false,
    };
  } catch (error) {
    if (error.code === 'SCRAPE_TIMEOUT') {
      return { allowed: true, status: 504, reason: 'timeout' };
    }
    console.error('[scraper] fetch failed', rawUrl, error);
    return { allowed: true, status: 502, reason: 'fetch_failed' };
  }
}
