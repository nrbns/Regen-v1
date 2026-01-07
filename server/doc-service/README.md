# Document Auto-Edit Service

AI-driven document transformation service for Regen Browser.

## Features

- **Text Editing**: Rewrite, grammar fix, summarize, expand, translate
- **Format Support**: DOCX, PDF, XLSX, TXT, MD
- **OCR**: Extract text from scanned PDFs
- **Privacy-First**: Local Ollama by default, cloud LLM opt-in
- **Preview & Diff**: See changes before applying
- **Batch Processing**: Edit multiple files at once

## Installation

```bash
cd server
npm install express multer uuid mammoth docx pdf-lib xlsx tesseract.js
```

## API Endpoints

### POST /api/doc/edit

Upload and edit a document.

**Request:**

- `file`: FormData file upload
- `task`: Edit task (rewrite, grammar, summarize, etc.)
- `style`: Style option (formal, casual, concise, etc.)
- `language`: Target language code (for translate)
- `cloudLLM`: Boolean (requires consent)
- `output`: Output format (original, docx, pdf, txt)

**Response:**

```json
{
  "id": "uuid",
  "task": "rewrite",
  "fileType": "docx",
  "originalName": "document.docx",
  "downloadUrl": "/api/doc/download/{id}",
  "previewUrl": "/api/doc/preview/{id}",
  "changes": [...],
  "confidence": "high",
  "metadata": {
    "model": "llama3.2:3b",
    "processingTime": 2500,
    "wordCount": 1500
  }
}
```

### GET /api/doc/download/:id

Download processed file.

### GET /api/doc/preview/:id

Get preview/diff of edits.

### POST /api/doc/batch

Batch process multiple files.

## Usage

```typescript
import { docServiceRouter } from './server/doc-service';

// Add to Express app
app.use('/api/doc', docServiceRouter);
```

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key (optional, for cloud LLM)
- `ANTHROPIC_API_KEY`: Anthropic API key (optional, for cloud LLM)

## Architecture

- `services/docx.ts`: DOCX parsing and generation
- `services/pdf.ts`: PDF text extraction and generation
- `services/excel.ts`: Excel normalization and transforms
- `services/ocr.ts`: OCR for scanned documents
- `services/ai-proxy.ts`: Unified AI interface (local/cloud)
- `services/encryption.ts`: File encryption for cloud processing

## Security

- Files encrypted at rest when using cloud LLM
- Explicit user consent required for cloud processing
- Automatic cleanup of temporary files
- Audit logs for all edits

## TODO

- [ ] Worker queue for async processing
- [ ] Progress notifications via WebSocket
- [ ] Command palette integration
- [ ] Template filling
- [ ] Layout preservation for PDFs
- [ ] Multi-language OCR support
