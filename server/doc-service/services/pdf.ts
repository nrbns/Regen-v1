/**
 * PDF Document Service
 * Handles PDF text extraction, editing, and regeneration
 * Uses pdf-parse for better text extraction, pdf-lib for generation
 */

import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import { aiProxy } from './ai-proxy';
import { ocrService } from './ocr';
import type { EditTask, EditOptions, EditResult, Change } from '../types';

export const pdfService = {
  /**
   * Edit a PDF file
   */
  async edit(filePath: string, task: EditTask, options: EditOptions): Promise<EditResult> {
    const startTime = Date.now();

    // 1. Extract text from PDF using pdf-parse (better than pdf-lib for extraction)
    const buffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(buffer);
    let pageCount = pdfDoc.getPageCount();

    let extractedText = '';

    // Try pdf-parse first (works for text-based PDFs)
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages || pageCount;

      if (extractedText && extractedText.trim().length > 10) {
        console.log('[PDFService] Successfully extracted text using pdf-parse');
      }
    } catch (error) {
      console.warn('[PDFService] pdf-parse failed, trying OCR:', error);
    }

    // If no text extracted, try OCR (for scanned PDFs)
    if (!extractedText || extractedText.trim().length < 10) {
      console.log('[PDFService] Using OCR for text extraction (scanned PDF)');
      try {
        extractedText = await ocrService.extractText(filePath, options.language || 'en');
      } catch (ocrError) {
        console.error('[PDFService] OCR also failed:', ocrError);
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('Could not extract text from PDF. File may be image-only or corrupted.');
    }

    // 2. Perform AI edit
    const editedText = await aiProxy.editText(extractedText, task, options);

    // 3. Regenerate PDF with edited text
    const outputPath = await this.generatePdf(editedText, options);

    // 4. Calculate changes
    const changes = this.calculateChanges(extractedText, editedText);

    const processingTime = Date.now() - startTime;

    return {
      outputPath,
      changes,
      confidence: this.calculateConfidence(changes, extractedText.length),
      metadata: {
        processingTime,
        wordCount: editedText.split(/\s+/).length,
        pageCount,
      },
    };
  },

  /**
   * Generate PDF from text
   */
  async generatePdf(text: string, _options: EditOptions): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedStandardFont('Helvetica');

    const lines = text.split('\n');
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const maxWidth = pageWidth - 2 * margin;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const line of lines) {
      if (y < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      // Wrap long lines
      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > maxWidth && currentLine) {
          currentPage.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font,
          });
          y -= lineHeight;
          currentLine = word;

          if (y < margin + lineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
        });
        y -= lineHeight;
      }
    }

    const outputPath = path.join('temp/processed', `edited_${Date.now()}.pdf`);
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    return outputPath;
  },

  /**
   * Calculate changes (same as DOCX)
   */
  calculateChanges(original: string, edited: string): Change[] {
    const changes: Change[] = [];
    const originalLines = original.split('\n');
    const editedLines = edited.split('\n');

    const maxLines = Math.max(originalLines.length, editedLines.length);
    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] || '';
      const edit = editedLines[i] || '';

      if (orig !== edit) {
        if (!orig && edit) {
          changes.push({ type: 'added', edited: edit, position: i });
        } else if (orig && !edit) {
          changes.push({ type: 'removed', original: orig, position: i });
        } else {
          changes.push({
            type: 'modified',
            original: orig,
            edited: edit,
            position: i,
          });
        }
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
