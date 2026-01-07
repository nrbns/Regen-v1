/**
 * DOCX (Word) Document Service
 * Handles DOCX parsing, editing, and regeneration
 */

import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'fs/promises';
import path from 'path';
import { aiProxy } from './ai-proxy';
import type { EditTask, EditOptions, EditResult, Change } from '../types';

export const docxService = {
  /**
   * Edit a DOCX file
   */
  async edit(filePath: string, task: EditTask, options: EditOptions): Promise<EditResult> {
    const startTime = Date.now();

    // 1. Extract text from DOCX
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const originalText = result.value;

    // 2. Also extract HTML for better structure preservation
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const _htmlContent = htmlResult.value; // Reserved for future use

    // 3. Perform AI edit
    const editedText = await aiProxy.editText(originalText, task, options);

    // 4. Regenerate DOCX
    const outputPath = await this.generateDocx(editedText, options);

    // 5. Calculate changes (simplified diff)
    const changes = this.calculateChanges(originalText, editedText);

    const processingTime = Date.now() - startTime;

    return {
      outputPath,
      changes,
      confidence: this.calculateConfidence(changes, originalText.length),
      metadata: {
        processingTime,
        wordCount: editedText.split(/\s+/).length,
      },
    };
  },

  /**
   * Edit plain text file (TXT, MD)
   */
  async editText(filePath: string, task: EditTask, options: EditOptions): Promise<EditResult> {
    const startTime = Date.now();

    const originalText = await fs.readFile(filePath, 'utf-8');
    const editedText = await aiProxy.editText(originalText, task, options);

    // Save edited text
    const outputPath = path.join(
      'temp/processed',
      `${path.basename(filePath, path.extname(filePath))}_edited${path.extname(filePath)}`
    );
    await fs.writeFile(outputPath, editedText, 'utf-8');

    const changes = this.calculateChanges(originalText, editedText);
    const processingTime = Date.now() - startTime;

    return {
      outputPath,
      changes,
      confidence: this.calculateConfidence(changes, originalText.length),
      metadata: {
        processingTime,
        wordCount: editedText.split(/\s+/).length,
      },
    };
  },

  /**
   * Generate DOCX from text
   */
  async generateDocx(text: string, _options: EditOptions): Promise<string> {
    const paragraphs = text
      .split(/\n\n+/)
      .map(para => {
        if (para.trim().length === 0) return null;
        return new Paragraph({
          children: para.split('\n').map(
            line =>
              new TextRun({
                text: line.trim() || ' ',
                break: line.trim() ? 0 : 1,
              })
          ),
        });
      })
      .filter((p): p is Paragraph => p !== null);

    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    const outputPath = path.join('temp/processed', `edited_${Date.now()}.docx`);
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    return outputPath;
  },

  /**
   * Calculate changes between original and edited text
   */
  calculateChanges(original: string, edited: string): Change[] {
    // Simplified diff - in production, use a proper diff library
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

  /**
   * Calculate confidence score
   */
  calculateConfidence(changes: Change[], originalLength: number): 'high' | 'medium' | 'low' {
    const changeRatio = changes.length / Math.max(originalLength / 100, 1);

    if (changeRatio < 0.1) return 'high';
    if (changeRatio < 0.3) return 'medium';
    return 'low';
  },
};
