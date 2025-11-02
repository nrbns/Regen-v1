/**
 * Robots-Aware Fetch
 * Respects robots.txt and rate limits
 */

import RobotsParser from 'robots-parser';
import { URL } from 'node:url';

interface RobotsCache {
  robots: any; // robots-parser instance
  fetchedAt: number;
}

const robotsCache = new Map<string, RobotsCache>();
const lastFetchTime = new Map<string, number>();

const CACHE_TTL = 3600000; // 1 hour
const DEFAULT_CRAWL_DELAY = 1000; // 1 second default

/**
 * Get robots.txt for a domain
 */
async function getRobotsTxt(domain: string): Promise<any> {
  const cached = robotsCache.get(domain);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.robots;
  }
  
  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const response = await fetch(robotsUrl);
    if (response.ok) {
      const text = await response.text();
      const robots = RobotsParser(robotsUrl, text);
      robotsCache.set(domain, {
        robots,
        fetchedAt: Date.now(),
      });
      return robots;
    }
  } catch (error) {
    console.warn(`[RobotsFetch] Could not fetch robots.txt for ${domain}:`, error);
  }
  
  // Return permissive robots if fetch fails
  return RobotsParser(`https://${domain}/robots.txt`, 'User-agent: *\nAllow: /');
}

/**
 * Check if URL is allowed by robots.txt
 */
async function isUrlAllowed(url: string, userAgent: string = 'OmniBrowser/1.0'): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const robots = await getRobotsTxt(domain);
    return robots.isAllowed(url, userAgent);
  } catch (error) {
    // If parsing fails, allow by default
    return true;
  }
}

/**
 * Get crawl delay for a domain
 */
async function getCrawlDelayForDomain(url: string): Promise<number> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const robots = await getRobotsTxt(domain);
    const delay = robots.getCrawlDelay('OmniBrowser/1.0');
    return delay || DEFAULT_CRAWL_DELAY;
  } catch (error) {
    return DEFAULT_CRAWL_DELAY;
  }
}

/**
 * Robots-aware fetch
 */
export async function robotsAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  userAgent: string = 'OmniBrowser/1.0'
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  // Check robots.txt
  const allowed = await isUrlAllowed(url, userAgent);
  if (!allowed) {
    throw new Error(`URL disallowed by robots.txt: ${url}`);
  }
  
  // Check rate limit
  const parsed = new URL(url);
  const domain = parsed.hostname;
  const lastFetch = lastFetchTime.get(domain);
  if (lastFetch) {
    const delay = await getCrawlDelayForDomain(url);
    const timeSinceLastFetch = Date.now() - lastFetch;
    if (timeSinceLastFetch < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastFetch));
    }
  }
  
  // Perform fetch
  const response = await fetch(input, {
    ...init,
    headers: {
      'User-Agent': userAgent,
      ...init?.headers,
    },
  });
  
  // Update last fetch time
  lastFetchTime.set(domain, Date.now());
  
  return response;
}

