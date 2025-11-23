/**
 * Cookie Isolation Persistence
 * Persists cookies per-tab partition for session restore
 */

import { session } from 'electron';
import { createLogger } from './utils/logger';
import { app } from 'electron';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const log = createLogger('cookie-persistence');

const COOKIE_DIR = join(app.getPath('userData'), 'cookies');

interface CookieSnapshot {
  partition: string;
  cookies: Electron.Cookie[];
  timestamp: number;
}

/**
 * Save cookies for a partition
 */
export async function saveCookiesForPartition(partition: string): Promise<void> {
  try {
    mkdirSync(COOKIE_DIR, { recursive: true });

    const ses = session.fromPartition(partition);
    const cookies = await ses.cookies.get({});

    const snapshot: CookieSnapshot = {
      partition,
      cookies,
      timestamp: Date.now(),
    };

    const filePath = join(COOKIE_DIR, `${partition.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

    log.debug('Cookies saved for partition', { partition, count: cookies.length });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to save cookies', { partition, error: err.message });
  }
}

/**
 * Restore cookies for a partition
 */
export async function restoreCookiesForPartition(partition: string): Promise<void> {
  try {
    const filePath = join(COOKIE_DIR, `${partition.replace(/[^a-zA-Z0-9]/g, '_')}.json`);

    if (!existsSync(filePath)) {
      log.debug('No cookie snapshot found for partition', { partition });
      return;
    }

    const content = readFileSync(filePath, 'utf8');
    const snapshot: CookieSnapshot = JSON.parse(content);

    // Validate snapshot age (don't restore if > 7 days old)
    const age = Date.now() - snapshot.timestamp;
    if (age > 7 * 24 * 60 * 60 * 1000) {
      log.warn('Cookie snapshot too old, skipping restore', { partition, age });
      return;
    }

    const ses = session.fromPartition(partition);

    // Restore cookies
    for (const cookie of snapshot.cookies) {
      try {
        // Cookie.set() requires url property
        const cookieDetails: Electron.CookiesSetDetails = {
          url: cookie.domain ? `https://${cookie.domain}` : 'https://localhost',
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
          sameSite: cookie.sameSite,
        };
        await ses.cookies.set(cookieDetails);
      } catch {
        // Some cookies may fail to set (expired, invalid domain, etc.)
        log.debug('Failed to restore cookie', {
          partition,
          name: cookie.name,
          domain: cookie.domain,
        });
      }
    }

    log.info('Cookies restored for partition', {
      partition,
      count: snapshot.cookies.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to restore cookies', { partition, error: err.message });
  }
}

/**
 * Clear cookies for a partition
 */
export async function clearCookiesForPartition(partition: string): Promise<void> {
  try {
    const ses = session.fromPartition(partition);
    // Get all cookies first, then remove them
    const cookies = await ses.cookies.get({});
    for (const cookie of cookies) {
      const url = cookie.domain
        ? `https://${cookie.domain}${cookie.path || '/'}`
        : 'https://localhost';
      await ses.cookies.remove(url, cookie.name);
    }
    log.info('Cookies cleared for partition', { partition });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Failed to clear cookies', { partition, error: err.message });
  }
}
