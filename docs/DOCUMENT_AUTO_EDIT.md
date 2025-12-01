# Document Auto-Edit Feature

## Overview

Built-in, AI-driven "auto-edit" feature that transforms Regen from a browser into a productivity OS. Enables automated document editing, format conversion, and AI-powered transformations.

## Features Implemented

### ✅ Core Services
- **DOCX Service**: Full roundtrip editing (DOCX → text → DOCX)
- **PDF Service**: Text extraction, editing, and regeneration
- **Excel Service**: Normalization, data transforms, template filling
- **OCR Service**: Text extraction from scanned PDFs
- **AI Proxy**: Unified interface for local (Ollama) and cloud LLMs
- **Encryption Service**: File encryption for cloud processing

### ✅ API Endpoints
- `POST /api/doc/edit` - Edit single document
- `GET /api/doc/preview/:id` - Preview changes
- `GET /api/doc/download/:id` - Download processed file
- `POST /api/doc/batch` - Batch process multiple files

### ✅ Frontend Components
- Document upload with drag-and-drop
- Edit task selection (rewrite, grammar, summarize, etc.)
- Style and language options
- Preview/diff viewer
- Confidence indicators
- Download functionality

## Edit Tasks Supported

1. **rewrite** - Rewrite text with style options
2. **grammar** - Fix grammar and spelling
3. **summarize** - Create concise summary
4. **expand** - Add detail and explanations
5. **translate** - Translate to target language
6. **formal** - Make text formal/professional
7. **casual** - Make text casual/friendly
8. **concise** - Make text concise
9. **bulletize** - Convert to bullet points
10. **normalize** - Normalize data (Excel)
11. **fill-template** - Fill template placeholders

## File Formats Supported

- **DOCX** - Microsoft Word documents
- **PDF** - Portable Document Format (text PDFs)
- **XLSX/XLS** - Excel spreadsheets
- **TXT** - Plain text files
- **MD** - Markdown files

## Privacy & Security

- **Local-First**: Uses local Ollama by default
- **Cloud Opt-In**: Requires explicit consent for cloud LLM
- **Encryption**: Files encrypted when using cloud processing
- **Auto-Cleanup**: Temporary files deleted after processing
- **Audit Logs**: All edits logged with metadata

## Usage Example

```typescript
// Frontend
const formData = new FormData();
formData.append('file', file);
formData.append('task', 'rewrite');
formData.append('style', 'formal');
formData.append('cloudLLM', 'false');

const response = await fetch('/api/doc/edit', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// { id, downloadUrl, previewUrl, changes, confidence, ... }
```

## Next Steps

1. **Worker Queue**: Implement async processing for large files
2. **Progress Notifications**: WebSocket updates for processing status
3. **Command Palette**: Integrate with Regen's command system
4. **Template Library**: Pre-built templates for common use cases
5. **Layout Preservation**: Better PDF formatting preservation
6. **Multi-language OCR**: Support for Hindi, Tamil, etc.

## Dependencies

```json
{
  "docx": "^8.5.0",
  "mammoth": "^1.6.0",
  "pdf-lib": "^1.17.1",
  "xlsx": "^0.18.5",
  "tesseract.js": "^5.0.4",
  "multer": "^1.4.5-lts.1",
  "express": "^4.19.2",
  "uuid": "^13.0.0"
}
```

## Installation

```bash
cd server
npm install
```

## Integration

Add to your Express/Fastify server:

```typescript
import { docServiceRouter } from './server/doc-service';

app.use('/api/doc', docServiceRouter);
```

Add route to frontend:

```typescript
import DocumentEditorPage from './routes/DocumentEditor';

// In your router
<Route path="/doc-editor" element={<DocumentEditorPage />} />
```

