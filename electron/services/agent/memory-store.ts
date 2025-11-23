/**
 * Agent Persistent Memory Store
 * SQLite-based storage for agent context, preferences, goals, and history
 */

import { app } from 'electron';
import { join } from 'path';
import { createLogger } from '../utils/logger';

const log = createLogger('agent-memory');

// Dynamically import better-sqlite3 (optional dependency)
let Database: any = null;
let dbModuleAvailable = false;

try {
  // @ts-ignore - better-sqlite3 is optional dependency
  Database = require('better-sqlite3');
  dbModuleAvailable = true;
} catch (error) {
  log.warn('better-sqlite3 not available, using in-memory fallback', { error });
  dbModuleAvailable = false;
}

export interface AgentContext {
  agentId: string;
  lastTask?: string;
  preferences: Record<string, unknown>;
  goals: string[];
  history: Array<{
    task: string;
    result: unknown;
    timestamp: number;
  }>;
}

export class AgentMemoryStore {
  private db: any = null;
  private isAvailable = dbModuleAvailable;
  private dbPath: string;

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'agent-memory.db');
  }

  private async initialize(): Promise<void> {
    if (!this.isAvailable) {
      log.warn('SQLite not available, agent memory persistence disabled');
      return;
    }

    if (this.db) return;

    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      this.initSchema();
      log.info('Agent memory store initialized', { dbPath: this.dbPath });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to initialize agent memory store', {
        error: err.message,
        stack: err.stack,
      });
      this.isAvailable = false;
      return;
    }
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_contexts (
        agent_id TEXT PRIMARY KEY,
        context_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_updated_at ON agent_contexts(updated_at);
    `);
  }

  async getContext(agentId: string): Promise<AgentContext | null> {
    if (!this.isAvailable) {
      await this.initialize();
    }
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT context_json FROM agent_contexts WHERE agent_id = ?');
      const row = stmt.get(agentId) as { context_json: string } | undefined;

      if (!row) {
        return null;
      }

      return JSON.parse(row.context_json) as AgentContext;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to get agent context', { agentId, error: err.message });
      return null;
    }
  }

  async saveContext(agentId: string, context: AgentContext): Promise<void> {
    if (!this.isAvailable) {
      await this.initialize();
    }
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO agent_contexts (agent_id, context_json, updated_at) VALUES (?, ?, ?)'
      );
      stmt.run(agentId, JSON.stringify(context), Date.now());
      log.debug('Agent context saved', { agentId });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to save agent context', { agentId, error: err.message });
    }
  }

  async addHistory(agentId: string, task: string, result: unknown): Promise<void> {
    if (!this.isAvailable) {
      await this.initialize();
    }
    if (!this.db) return;

    try {
      const context = (await this.getContext(agentId)) || {
        agentId,
        preferences: {},
        goals: [],
        history: [],
      };

      context.history.push({
        task,
        result,
        timestamp: Date.now(),
      });

      // Keep only last 100 entries per blueprint
      if (context.history.length > 100) {
        context.history = context.history.slice(-100);
      }

      await this.saveContext(agentId, context);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Failed to add history', { agentId, error: err.message });
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        log.info('Agent memory store closed');
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error('Failed to close agent memory store', { error: err.message });
      }
    }
  }
}

export const agentMemoryStore = new AgentMemoryStore();
