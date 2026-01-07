/* eslint-env node */
/**
 * PDF Upload + Smart Extraction + Auto-Research
 * Converted from Python production code
 */

// import FormData from 'form-data'; // Unused
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PDF parsing libraries
let pdfjsLib = null;
try {
  // Try to use pdfjs-dist (Node.js compatible)
  pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
} catch {
  console.warn('[PDFExtractor] pdfjs-dist not available, using fallback');
}

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractTextWithPDFJS(pdfBytes) {
  if (!pdfjsLib) {
    throw new Error('PDF.js not available');
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  let fullText = '';
  const tables = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Extract text
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';

    // Note: Table extraction would require additional processing
    // For now, we extract text and let LLM handle structure
  }

  return {
    text: fullText,
    pages: pdf.numPages,
    tables: tables, // Placeholder - would need table extraction library
  };
}

/**
 * Extract text from PDF using fallback method
 */
async function extractTextFallback(pdfBytes) {
  // Save to temp file and use external tool
  const tempFile = path.join(__dirname, '../../tmp', `pdf_${Date.now()}.pdf`);

  // Ensure tmp directory exists
  const tmpDir = path.dirname(tempFile);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  fs.writeFileSync(tempFile, pdfBytes);

  try {
    // Try pdftotext (requires poppler-utils)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`pdftotext "${tempFile}" -`);
    fs.unlinkSync(tempFile);

    return {
      text: stdout,
      pages: 0, // Unknown
      tables: [],
    };
  } catch (error) {
    // Cleanup
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    // Last resort: Return error
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text, tables, and figures from PDF
 */
export async function extractPDF(pdfBytes, _filename = 'document.pdf') {
  try {
    // Try PDF.js first
    if (pdfjsLib) {
      return await extractTextWithPDFJS(pdfBytes);
    }

    // Fallback to external tool
    return await extractTextFallback(pdfBytes);
  } catch (error) {
    console.error('[PDFExtractor] Extraction failed:', error);
    throw error;
  }
}

/**
 * Auto-trigger research on PDF content
 */
export async function autoResearchPDF(extractedText, options = {}) {
  const { executeLangGraphWorkflow } = await import('../research/langgraph-workflow.js');

  // Create research query from PDF content
  const query =
    options.customQuery ||
    `Key insights and criticisms of this paper: ${extractedText.substring(0, 12000)}`;

  // Trigger research
  const researchResult = await executeLangGraphWorkflow(query);

  return {
    researchResult,
    query,
    extractedLength: extractedText.length,
  };
}

/**
 * Process uploaded PDF
 */
export async function processPDFUpload(file, options = {}) {
  const { autoResearch = true } = options;

  // Extract content
  const extracted = await extractPDF(file.buffer || file.data, file.filename);

  // Auto-trigger research if enabled
  let researchTask = null;
  if (autoResearch && extracted.text) {
    try {
      researchTask = await autoResearchPDF(extracted.text, options);
    } catch (error) {
      console.warn('[PDFProcessor] Auto-research failed:', error.message);
    }
  }

  return {
    title: file.filename || 'document.pdf',
    pages: extracted.pages,
    extracted_text_length: extracted.text.length,
    tables_found: extracted.tables.length,
    research_status: researchTask ? 'completed' : 'not_triggered',
    research_result: researchTask?.researchResult || null,
    extracted_text: extracted.text.substring(0, 1000), // First 1000 chars as preview
  };
}
