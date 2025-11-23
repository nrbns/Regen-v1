/**
 * Store Migration System
 * Handles versioned migrations for persistent stores
 */

import { createLogger } from './utils/logger';

const log = createLogger('store-migrations');

export interface Migration {
  version: number;
  name: string;
  up: () => Promise<void> | void;
  down?: () => Promise<void> | void;
}

const migrations: Migration[] = [];
let currentVersion = 0;

/**
 * Register a migration
 */
export function registerMigration(migration: Migration): void {
  migrations.push(migration);
  migrations.sort((a, b) => a.version - b.version);
  log.info('Migration registered', { version: migration.version, name: migration.name });
}

/**
 * Run migrations up to target version
 */
export async function migrateTo(targetVersion: number): Promise<void> {
  const pending = migrations.filter(m => m.version > currentVersion && m.version <= targetVersion);

  if (pending.length === 0) {
    log.info('No migrations to run', { currentVersion, targetVersion });
    return;
  }

  log.info('Running migrations', {
    currentVersion,
    targetVersion,
    count: pending.length,
  });

  for (const migration of pending) {
    try {
      log.info('Running migration', { version: migration.version, name: migration.name });
      await migration.up();
      currentVersion = migration.version;
      log.info('Migration completed', { version: migration.version, name: migration.name });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Migration failed', {
        version: migration.version,
        name: migration.name,
        error: err.message,
      });
      throw error;
    }
  }

  log.info('All migrations completed', { currentVersion: targetVersion });
}

/**
 * Get current migration version
 */
export function getCurrentVersion(): number {
  return currentVersion;
}

/**
 * Get all registered migrations
 */
export function getMigrations(): Migration[] {
  return [...migrations];
}
