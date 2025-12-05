/**
 * Export Utilities
 * Functions for exporting data to various formats (JSON, CSV, etc.)
 */
import type { MemoryEvent } from '../core/supermemory/tracker';
/**
 * Convert memory events to JSON format
 */
export declare function exportMemoriesToJSON(events: MemoryEvent[]): string;
/**
 * Convert memory events to CSV format
 */
export declare function exportMemoriesToCSV(events: MemoryEvent[]): string;
/**
 * Download data as a file
 */
export declare function downloadFile(content: string, filename: string, mimeType?: string): void;
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
export declare function exportMemories(events: MemoryEvent[], options: ExportOptions): void;
