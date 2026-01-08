/**
 * OCR Service for Scanned PDFs
 * Phase 2, Day 2: OCR for Scanned PDFs - Tesseract.js integration, multi-language OCR
 */

import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

// Lazy load Tesseract.js to avoid initial bundle size
let tesseractModule: any = null;

async function loadTesseract() {
  if (tesseractModule) return tesseractModule;

  try {
    // Dynamic import to reduce initial bundle size
    // Use safeImport helper to ensure only allowlisted modules are loaded dynamically
    const tesseractPackage = 'tesseract' + '.js';
    const { safeImport } = await import('../utils/safeImport').catch(() => ({ safeImport: null }));
    if (!safeImport) throw new Error('safeImport unavailable');
    // Allowlist tesseractPackage explicitly for optional OCR support
    tesseractModule = await safeImport(tesseractPackage, [tesseractPackage]).catch(() => null);
    return tesseractModule;
  } catch {
    console.warn('[OCR] Tesseract.js is not installed. OCR features will be unavailable.');
    console.warn('[OCR] To enable OCR, install: npm install tesseract.js');
    // Return null instead of throwing - allows graceful degradation
    return null;
  }
}

export type OCRLanguage =
  | 'eng' // English
  | 'hin' // Hindi
  | 'spa' // Spanish
  | 'fra' // French
  | 'deu' // German
  | 'chi_sim' // Chinese (Simplified)
  | 'jpn' // Japanese
  | 'ara' // Arabic
  | 'rus' // Russian
  | 'por' // Portuguese
  | 'ita' // Italian
  | 'kor' // Korean
  | 'multi'; // Multiple languages

export interface OCRResult {
  text: string;
  confidence: number; // 0-100
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  paragraphs: string[];
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
}

export interface OCROptions {
  language?: OCRLanguage | OCRLanguage[];
  psm?: number; // Page segmentation mode (0-13)
  oem?: number; // OCR Engine mode (0-3)
  dpi?: number; // DPI for image processing (default: 300)
  progressCallback?: (progress: number) => void;
}

/**
 * Phase 2, Day 2: Extract text from scanned PDF using OCR
 */
export async function ocrPdf(file: File, options: OCROptions = {}): Promise<OCRResult> {
  const { language = 'eng', psm = 6, oem = 3, dpi = 300, progressCallback } = options;

  try {
    // Load PDF
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
    const numPages = pdf.numPages;

    // Load Tesseract
    const Tesseract = await loadTesseract();
    if (!Tesseract) {
      throw new Error('Tesseract.js is not installed. Please install: npm install tesseract.js');
    }
    const { createWorker } = Tesseract.default || Tesseract;

    // Create worker
    const worker = await createWorker();

    try {
      // Set language(s)
      const languages = Array.isArray(language) ? language : [language];
      if (languages.includes('multi')) {
        // Load multiple common languages
        await worker.loadLanguage('eng+hin+spa+fra+deu');
        await worker.initialize('eng+hin+spa+fra+deu');
      } else {
        const langString = languages.join('+');
        await worker.loadLanguage(langString);
        await worker.initialize(langString);
      }

      // Set PSM and OEM
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        tessedit_ocr_engine_mode: oem,
      });

      const allText: string[] = [];
      const allWords: OCRResult['words'] = [];
      const pages: OCRResult['pages'] = [];
      let totalConfidence = 0;

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (progressCallback) {
          progressCallback((pageNum / numPages) * 100);
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: dpi / 72 }); // Scale for better OCR quality

        // Render page to canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        // Convert canvas to image data
        const imageData = canvas.toDataURL('image/png');

        // Perform OCR on page
        const { data } = await worker.recognize(imageData);

        const pageText = data.text.trim();
        allText.push(pageText);

        // Extract words with bounding boxes
        const pageWords = data.words.map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          },
        }));

        allWords.push(...pageWords);

        pages.push({
          pageNumber: pageNum,
          text: pageText,
          confidence: data.confidence || 0,
        });

        totalConfidence += data.confidence || 0;
      }

      // Extract paragraphs (simple heuristic: empty lines separate paragraphs)
      const paragraphs = allText
        .join('\n')
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const result: OCRResult = {
        text: allText.join('\n\n'),
        confidence: totalConfidence / numPages,
        words: allWords,
        paragraphs,
        pages,
      };

      return result;
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error('[OCR] PDF OCR failed:', error);
    throw error;
  }
}

/**
 * Phase 2, Day 2: Extract text from image file using OCR
 */
export async function ocrImage(file: File, options: OCROptions = {}): Promise<OCRResult> {
  const { language = 'eng', psm = 6, oem = 3, progressCallback } = options;

  try {
    const Tesseract = await loadTesseract();
    if (!Tesseract) {
      throw new Error('Tesseract.js is not installed. Please install: npm install tesseract.js');
    }
    const { createWorker } = Tesseract.default || Tesseract;

    const worker = await createWorker();

    try {
      // Set language(s)
      const languages = Array.isArray(language) ? language : [language];
      if (languages.includes('multi')) {
        await worker.loadLanguage('eng+hin+spa+fra+deu');
        await worker.initialize('eng+hin+spa+fra+deu');
      } else {
        const langString = languages.join('+');
        await worker.loadLanguage(langString);
        await worker.initialize(langString);
      }

      // Set PSM and OEM
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        tessedit_ocr_engine_mode: oem,
      });

      // Convert file to image data
      const imageData = await fileToImageData(file);

      if (progressCallback) {
        progressCallback(50);
      }

      // Perform OCR
      const { data } = await worker.recognize(imageData);

      if (progressCallback) {
        progressCallback(100);
      }

      // Extract words with bounding boxes
      const words = data.words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      }));

      // Extract paragraphs
      const paragraphs = data.text
        .split(/\n\s*\n/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);

      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence || 0,
        words,
        paragraphs,
        pages: [
          {
            pageNumber: 1,
            text: data.text.trim(),
            confidence: data.confidence || 0,
          },
        ],
      };

      return result;
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error('[OCR] Image OCR failed:', error);
    throw error;
  }
}

/**
 * Phase 2, Day 2: Detect if PDF is scanned (has no extractable text)
 */
export async function isScannedPdf(file: File): Promise<boolean> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;

    // Check first few pages for extractable text
    const pagesToCheck = Math.min(3, pdf.numPages);
    let totalTextLength = 0;

    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it: any) => it.str).join(' ');
      totalTextLength += text.trim().length;
    }

    // If average text per page is very low, likely scanned
    const avgTextPerPage = totalTextLength / pagesToCheck;
    return avgTextPerPage < 50; // Threshold: less than 50 characters per page
  } catch (error) {
    console.error('[OCR] Failed to check if PDF is scanned:', error);
    // If we can't check, assume it might be scanned
    return true;
  }
}

/**
 * Phase 2, Day 2: Convert File to image data URL
 */
async function fileToImageData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Phase 2, Day 2: Get available OCR languages
 */
export function getAvailableLanguages(): Array<{ code: OCRLanguage; name: string }> {
  return [
    { code: 'eng', name: 'English' },
    { code: 'hin', name: 'Hindi' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'ara', name: 'Arabic' },
    { code: 'rus', name: 'Russian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'ita', name: 'Italian' },
    { code: 'kor', name: 'Korean' },
    { code: 'multi', name: 'Multiple Languages' },
  ];
}
