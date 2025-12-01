/**
 * Excel Document Service
 * Handles XLSX/XLS reading, normalization, and editing
 */

import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { aiProxy } from './ai-proxy';
import type { EditTask, EditOptions, EditResult, Change } from '../types';

export const excelService = {
  /**
   * Edit an Excel file
   */
  async edit(
    filePath: string,
    task: EditTask,
    options: EditOptions
  ): Promise<EditResult> {
    const startTime = Date.now();

    // 1. Read Excel file
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 2. Convert to JSON for processing
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // 3. Perform transformation based on task
    let transformedData: any[][];
    let changes: Change[] = [];

    if (task === 'normalize') {
      transformedData = await this.normalizeData(jsonData, options);
      changes = this.calculateExcelChanges(jsonData, transformedData);
    } else if (task === 'fill-template') {
      transformedData = await this.fillTemplate(jsonData, options);
      changes = this.calculateExcelChanges(jsonData, transformedData);
    } else {
      // For text-based tasks, convert to text, edit, then convert back
      const text = this.excelToText(jsonData);
      const editedText = await aiProxy.editText(text, task, options);
      transformedData = this.textToExcel(editedText);
      changes = this.calculateTextChanges(text, editedText);
    }

    // 4. Write back to Excel
    const newWorksheet = XLSX.utils.aoa_to_sheet(transformedData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    const outputPath = path.join('temp/processed', `edited_${Date.now()}.xlsx`);
    const excelBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(outputPath, excelBuffer);

    const processingTime = Date.now() - startTime;

    return {
      outputPath,
      changes,
      confidence: this.calculateConfidence(changes, jsonData.length),
      metadata: {
        processingTime,
        wordCount: transformedData.flat().join(' ').split(/\s+/).length,
      },
    };
  },

  /**
   * Normalize Excel data (trim, parse numbers, detect types, add computed columns)
   */
  async normalizeData(data: any[][], options: EditOptions): Promise<any[][]> {
    if (data.length === 0) return data;

    // Detect header row (first non-empty row)
    let headerRow: any[] = [];
    let dataStartIndex = 0;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      if (data[i].some(cell => cell && String(cell).trim().length > 0)) {
        headerRow = data[i];
        dataStartIndex = i + 1;
        break;
      }
    }

    // Normalize each cell
    const normalized = data.map((row, _rowIndex) =>
      row.map((cell, _colIndex) => {
        if (typeof cell === 'string') {
          // Trim whitespace
          let value = cell.trim();
          
          // Skip empty cells
          if (!value) return '';
          
          // Try to parse as number
          const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
          if (!isNaN(numValue) && value.replace(/[^\d.-]/g, '') === numValue.toString()) {
            return numValue;
          }
          
          // Try to parse as date (common formats)
          const dateFormats = [
            /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
            /^\d{2}-\d{2}-\d{4}/, // MM-DD-YYYY
          ];
          
          for (const format of dateFormats) {
            if (format.test(value)) {
              const dateValue = new Date(value);
              if (!isNaN(dateValue.getTime())) {
                return dateValue;
              }
            }
          }
          
          return value;
        }
        return cell;
      })
    );

    // Add computed columns if requested (e.g., Total, Average)
    if (options.style === 'professional' && normalized.length > dataStartIndex) {
      // Example: Add a "Total" column if numeric columns detected
      const numericCols: number[] = [];
      for (let col = 0; col < normalized[dataStartIndex]?.length || 0; col++) {
        const sampleValue = normalized[dataStartIndex]?.[col];
        if (typeof sampleValue === 'number') {
          numericCols.push(col);
        }
      }

      if (numericCols.length > 0) {
        // Add header
        if (headerRow.length > 0) {
          headerRow.push('Total');
        }

        // Calculate totals for each row
        for (let i = dataStartIndex; i < normalized.length; i++) {
          const row = normalized[i];
          const total = numericCols.reduce((sum, col) => {
            const val = row[col];
            return sum + (typeof val === 'number' ? val : 0);
          }, 0);
          row.push(total);
        }
      }
    }

    return normalized;
  },

  /**
   * Fill template with provided values
   */
  async fillTemplate(data: any[][], options: EditOptions): Promise<any[][]> {
    if (!options.template) {
      return data;
    }

    const filled = data.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string') {
          let value = cell;
          // Replace template placeholders
          for (const [key, replacement] of Object.entries(options.template || {})) {
            value = value.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
          }
          return value;
        }
        return cell;
      })
    );

    return filled;
  },

  /**
   * Convert Excel data to text
   */
  excelToText(data: any[][]): string {
    return data.map((row) => row.join('\t')).join('\n');
  },

  /**
   * Convert text back to Excel format
   */
  textToExcel(text: string): any[][] {
    return text.split('\n').map((line) => line.split('\t'));
  },

  /**
   * Calculate changes for Excel
   */
  calculateExcelChanges(original: any[][], edited: any[][]): Change[] {
    const changes: Change[] = [];
    const maxRows = Math.max(original.length, edited.length);

    for (let i = 0; i < maxRows; i++) {
      const origRow = original[i] || [];
      const editRow = edited[i] || [];
      const maxCols = Math.max(origRow.length, editRow.length);

      for (let j = 0; j < maxCols; j++) {
        const orig = origRow[j];
        const edit = editRow[j];

        if (orig !== edit) {
          changes.push({
            type: 'modified',
            original: String(orig || ''),
            edited: String(edit || ''),
            position: i * 1000 + j, // Encode row/col in position
          });
        }
      }
    }

    return changes;
  },

  calculateTextChanges(original: string, edited: string): Change[] {
    const changes: Change[] = [];
    const originalLines = original.split('\n');
    const editedLines = edited.split('\n');

    const maxLines = Math.max(originalLines.length, editedLines.length);
    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] || '';
      const edit = editedLines[i] || '';

      if (orig !== edit) {
        changes.push({
          type: 'modified',
          original: orig,
          edited: edit,
          position: i,
        });
      }
    }

    return changes;
  },

  calculateConfidence(changes: Change[], originalLength: number): 'high' | 'medium' | 'low' {
    const changeRatio = changes.length / Math.max(originalLength / 100, 1);
    
    if (changeRatio < 0.1) return 'high';
    if (changeRatio < 0.3) return 'medium';
    return 'low';
  },
};

