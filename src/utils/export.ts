/**
 * Export Utilities
 * Functions for exporting data to various formats (JSON, CSV, etc.)
 */

import type { MemoryEvent } from '../core/supermemory/tracker';

/**
 * Convert memory events to JSON format
 */
export function exportMemoriesToJSON(events: MemoryEvent[]): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: events.length,
    memories: events.map(event => ({
      id: event.id,
      type: event.type,
      value: event.value,
      metadata: event.metadata,
      timestamp: event.ts,
      score: event.score,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Convert memory events to CSV format
 */
export function exportMemoriesToCSV(events: MemoryEvent[]): string {
  if (events.length === 0) {
    return 'Type,Value,Title,URL,Timestamp,Tags\n';
  }

  const headers = ['Type', 'Value', 'Title', 'URL', 'Timestamp', 'Date', 'Time', 'Tags', 'Pinned'];
  const rows = events.map(event => {
    const date = new Date(event.ts);
    const tags = Array.isArray(event.metadata?.tags) ? event.metadata.tags.join('; ') : '';
    const pinned = event.metadata?.pinned ? 'Yes' : 'No';

    return [
      event.type,
      escapeCSV(String(event.value || '')),
      escapeCSV(event.metadata?.title || ''),
      escapeCSV(event.metadata?.url || ''),
      event.ts.toString(),
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      escapeCSV(tags),
      pinned,
    ];
  });

  const csvRows = [headers.join(','), ...rows.map(row => row.join(','))];
  return csvRows.join('\n');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field: string): string {
  if (!field) return '';

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}

/**
 * Download data as a file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export memories with options
 */
export interface ExportOptions {
  format: 'json' | 'csv';
  includeMetadata?: boolean;
  dateRange?: {
    start?: number;
    end?: number;
  };
  filterByType?: string[];
  filterByTags?: string[];
}

export function exportMemories(events: MemoryEvent[], options: ExportOptions): void {
  // Filter events based on options
  let filteredEvents = [...events];

  if (options.dateRange) {
    if (options.dateRange.start) {
      filteredEvents = filteredEvents.filter(e => e.ts >= options.dateRange!.start!);
    }
    if (options.dateRange.end) {
      filteredEvents = filteredEvents.filter(e => e.ts <= options.dateRange!.end!);
    }
  }

  if (options.filterByType && options.filterByType.length > 0) {
    filteredEvents = filteredEvents.filter(e => options.filterByType!.includes(e.type));
  }

  if (options.filterByTags && options.filterByTags.length > 0) {
    filteredEvents = filteredEvents.filter(e => {
      const eventTags = Array.isArray(e.metadata?.tags) ? e.metadata.tags : [];
      return options.filterByTags!.some(tag => eventTags.includes(tag));
    });
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = options.format === 'json' ? 'json' : 'csv';
  const filename = `omnibrowser-memories-${timestamp}.${extension}`;

  // Export based on format
  let content: string;
  let mimeType: string;

  if (options.format === 'json') {
    content = exportMemoriesToJSON(filteredEvents);
    mimeType = 'application/json';
  } else {
    content = exportMemoriesToCSV(filteredEvents);
    mimeType = 'text/csv';
  }

  // Download file
  downloadFile(content, filename, mimeType);
}
