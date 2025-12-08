import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { isScannedPdf, ocrPdf } from '../../../core/docs/ocrService';
export async function parsePdfFile(file, options) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = '';
    // Phase 2, Day 2: Check if PDF is scanned and use OCR if needed
    if (options?.useOCR) {
        const scanned = await isScannedPdf(file);
        if (scanned) {
            try {
                const ocrResult = await ocrPdf(file, { language: 'eng' });
                return ocrResult.text;
            }
            catch (error) {
                console.warn('[parsePdfFile] OCR failed, falling back to text extraction:', error);
                // Fall through to regular text extraction
            }
        }
    }
    // Regular text extraction
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const s = content.items.map((it) => it.str).join(' ');
        out += s + '\n';
    }
    // Phase 2, Day 2: If extracted text is very short, might be scanned
    const extractedText = out.trim();
    if (extractedText.length < 50 && !options?.useOCR) {
        // Suggest OCR
        console.info('[parsePdfFile] PDF might be scanned. Consider using OCR.');
    }
    return extractedText;
}
