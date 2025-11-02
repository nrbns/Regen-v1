/**
 * Plugin Export Implementation
 * CSV and JSON export functionality for plugins
 */

import { app } from 'electron';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXPORT_DIR = 'exports';

/**
 * Export data as CSV
 */
export async function exportCSV(name: string, rows: Record<string, unknown>[]): Promise<string> {
  if (rows.length === 0) {
    throw new Error('No data to export');
  }

  const dir = join(app.getPath('userData'), EXPORT_DIR);
  await import('node:fs/promises').then(fs => fs.mkdir(dir, { recursive: true })).catch(() => {});
  
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ];

  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.csv`;
  const filepath = join(dir, filename);
  await writeFile(filepath, csvLines.join('\n'), 'utf-8');

  return filepath;
}

/**
 * Export data as JSON
 */
export async function exportJSON(name: string, data: unknown): Promise<string> {
  const dir = join(app.getPath('userData'), EXPORT_DIR);
  await import('node:fs/promises').then(fs => fs.mkdir(dir, { recursive: true })).catch(() => {});
  
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.json`;
  const filepath = join(dir, filename);
  await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

  return filepath;
}

