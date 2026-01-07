/**
 * Document Auto-Edit Service
 * AI-driven document transformation (Word/PDF/Excel)
 *
 * Features:
 * - Text editing (rewrite, grammar, summarize, translate)
 * - Format conversion (DOCX ↔ PDF ↔ TXT)
 * - Excel normalization and transforms
 * - OCR for scanned PDFs
 * - Preview/diff before applying
 */

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { docxService } from './services/docx';
import { pdfService } from './services/pdf';
import { excelService } from './services/excel';
// import { ocrService } from './services/ocr'; // Reserved for future use
// import { aiProxy } from './services/ai-proxy'; // Reserved for future use
import { encryptionService } from './services/encryption';
import { queueDocumentEdit, getJobStatus } from './services/worker-queue';
import { retentionService } from './services/retention';
import type { EditTask, EditOptions, EditResult } from './types';

const router = express.Router();
const upload = multer({
  dest: 'temp/uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

// Ensure temp directories exist
const ensureDirs = async () => {
  await fs.mkdir('temp/uploads', { recursive: true });
  await fs.mkdir('temp/processed', { recursive: true });
  await fs.mkdir('temp/encrypted', { recursive: true });
};

ensureDirs().catch(console.error);

/**
 * POST /api/doc/edit
 * Auto-edit a document (sync for small files, async for large files)
 */
router.post('/edit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const task = req.body.task as EditTask;
    const options: EditOptions = {
      style: req.body.style || 'preserve',
      language: req.body.language || 'en',
      output: req.body.output || 'original',
      cloudLLM: req.body.cloudLLM === 'true',
      preserveFormatting: req.body.preserveFormatting !== 'false',
    };

    const fileId = uuidv4();
    const filePath = req.file.path;
    const fileType = detectFileType(req.file.originalname, req.file.mimetype);
    const fileSize = req.file.size;
    const useAsync = fileSize > 10 * 1024 * 1024; // Use async for files > 10MB

    console.log(
      `[DocService] Processing ${fileType} file: ${req.file.originalname} (task: ${task}, async: ${useAsync})`
    );

    if (useAsync) {
      // Queue for async processing
      const jobId = await queueDocumentEdit(filePath, fileType, task, options);

      res.json({
        id: fileId,
        jobId,
        status: 'queued',
        message: 'File queued for processing. Use /api/doc/status/:jobId to check progress.',
        statusUrl: `/api/doc/status/${jobId}`,
      });
      return;
    }

    // Process synchronously for small files
    let result: EditResult;

    switch (fileType) {
      case 'docx':
        result = await docxService.edit(filePath, task, options);
        break;
      case 'pdf':
        result = await pdfService.edit(filePath, task, options);
        break;
      case 'xlsx':
      case 'xls':
        result = await excelService.edit(filePath, task, options);
        break;
      case 'txt':
      case 'md':
        result = await docxService.editText(filePath, task, options);
        break;
      default:
        return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
    }

    // Encrypt processed file if using cloud LLM
    if (options.cloudLLM && result.outputPath) {
      const encryptedPath = await encryptionService.encryptFile(result.outputPath, fileId);
      result.encryptedPath = encryptedPath;
    }

    // Cleanup original upload after processing
    await fs.unlink(filePath).catch(() => {});

    res.json({
      id: fileId,
      task,
      fileType,
      originalName: req.file.originalname,
      downloadUrl: `/api/doc/download/${fileId}`,
      previewUrl: `/api/doc/preview/${fileId}`,
      changes: result.changes,
      confidence: result.confidence,
      metadata: {
        model: result.metadata?.model,
        processingTime: result.metadata?.processingTime,
        wordCount: result.metadata?.wordCount,
      },
    });
  } catch (error) {
    console.error('[DocService] Edit failed:', error);
    res.status(500).json({
      error: 'Document processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/doc/status/:jobId
 * Get status of async job
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

/**
 * GET /api/doc/preview/:id
 * Get preview/diff of edits
 */
router.get('/preview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Load preview data from cache/storage
    res.json({ id, preview: 'Not implemented yet' });
  } catch {
    res.status(500).json({ error: 'Preview failed' });
  }
});

/**
 * GET /api/doc/download/:id
 * Download processed file
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find file in processed directory
    const processedPath = path.join('temp/processed', id);
    let filePath: string;

    try {
      await fs.access(processedPath);
      filePath = processedPath;
    } catch {
      // Try encrypted file
      const encryptedPath = path.join('temp/encrypted', `${id}.enc`);
      try {
        await fs.access(encryptedPath);
        filePath = await encryptionService.decryptFile(encryptedPath, id);
      } catch {
        return res.status(404).json({ error: 'File not found' });
      }
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('[DocService] Download failed:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * DELETE /api/doc/:id
 * Delete processed file (cleanup)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await retentionService.deleteFile(id);
    res.json({ success: true, message: 'File deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * POST /api/doc/batch
 * Batch edit multiple files
 */
router.post('/batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const _task = req.body.task as EditTask;
    const _options: EditOptions = {
      style: req.body.style || 'preserve',
      language: req.body.language || 'en',
      output: req.body.output || 'original',
      cloudLLM: req.body.cloudLLM === 'true',
    };

    const results = await Promise.all(
      req.files.map(async file => {
        const fileType = detectFileType(file.originalname, file.mimetype);
        // Process each file (simplified - should use worker queue for large batches)
        return {
          originalName: file.originalname,
          status: 'pending',
          fileType,
        };
      })
    );

    res.json({ results, batchId: uuidv4() });
  } catch {
    res.status(500).json({ error: 'Batch processing failed' });
  }
});

/**
 * Detect file type from filename and MIME type
 */
function detectFileType(filename: string, mimetype: string): string {
  const ext = path.extname(filename).toLowerCase();

  const typeMap: Record<string, string> = {
    '.docx': 'docx',
    '.doc': 'doc',
    '.pdf': 'pdf',
    '.xlsx': 'xlsx',
    '.xls': 'xls',
    '.txt': 'txt',
    '.md': 'md',
    '.rtf': 'rtf',
  };

  return typeMap[ext] || mimetype.split('/')[1] || 'unknown';
}

export { router as docServiceRouter };
