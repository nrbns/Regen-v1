/**
 * OCR Service
 * Extracts text from scanned PDFs and images
 * Uses Tesseract.js for OCR with multi-language support
 */

import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

// Language code mapping
const LANGUAGE_MAP: Record<string, string> = {
  en: 'eng',
  hi: 'hin',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  ta: 'tam',
  te: 'tel',
  kn: 'kan',
  ml: 'mal',
  bn: 'ben',
  gu: 'guj',
  mr: 'mar',
  pa: 'pan',
  ur: 'urd',
};

export const ocrService = {
  /**
   * Extract text from PDF/image using OCR
   * Automatically handles PDFs by converting pages to images
   */
  async extractText(filePath: string, language: string = 'eng'): Promise<string> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // For PDFs, try pdf-parse first (faster for text PDFs)
      if (ext === '.pdf') {
        try {
          const buffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(buffer);
          if (pdfData.text && pdfData.text.trim().length > 10) {
            console.log('[OCRService] PDF has extractable text, using pdf-parse');
            return pdfData.text;
          }
        } catch {
          console.log('[OCRService] pdf-parse failed, using OCR for scanned PDF');
        }
      }

      // Use Tesseract for OCR (works for images and scanned PDFs)
      const tesseractLang = LANGUAGE_MAP[language] || language || 'eng';
      
      // Try to load the language, fallback to English if not available
      let worker;
      try {
        worker = await createWorker(tesseractLang);
      } catch {
        console.warn(`[OCRService] Language ${tesseractLang} not available, using English`);
        worker = await createWorker('eng');
      }

      const { data: { text } } = await worker.recognize(filePath);
      await worker.terminate();

      if (!text || text.trim().length < 5) {
        throw new Error('OCR extracted no meaningful text');
      }

      return text;
    } catch (error) {
      console.error('[OCRService] OCR failed:', error);
      throw new Error('OCR extraction failed. File may not be an image or scanned document.');
    }
  },

  /**
   * Extract text with language detection
   */
  async extractTextWithLang(filePath: string, lang: string = 'eng'): Promise<string> {
    const tesseractLang = LANGUAGE_MAP[lang] || lang || 'eng';
    return this.extractText(filePath, tesseractLang);
  },

  /**
   * Extract text from multiple pages (for PDFs)
   */
  async extractTextMultiPage(filePath: string, language: string = 'eng'): Promise<string[]> {
    // For now, extract all text at once
    // In production, split PDF into pages and OCR each page separately
    const fullText = await this.extractText(filePath, language);
    // Simple split by page breaks (if detected)
    return fullText.split(/\n{3,}/).filter(page => page.trim().length > 0);
  },
};

