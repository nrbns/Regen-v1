/**
 * PDF Upload Component
 * Drag & drop PDF upload with auto-research
 */

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface UploadState {
  uploading: boolean;
  uploaded: boolean;
  result: any | null;
  error: string | null;
}

export function PDFUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    uploaded: false,
    result: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setState(prev => ({
        ...prev,
        error: 'Please upload a PDF file',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      uploading: true,
      error: null,
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoResearch', 'true');

      const response = await fetch(`${API_BASE}/api/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        uploading: false,
        uploaded: true,
        result,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message || 'Upload failed',
      }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          state.uploading
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {state.uploading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <div className="mt-4 text-lg font-semibold text-indigo-700">
              Uploading & Processing...
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Regen is reading the entire paper right now
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400" />
            <div className="mt-4 text-lg font-semibold text-gray-700">
              Drop PDF here or click to upload
            </div>
            <div className="mt-2 text-sm text-gray-500">
              PDF will be automatically analyzed and researched
            </div>
          </>
        )}
      </div>

      {state.uploaded && state.result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <FileText size={20} />
            <span className="font-semibold">PDF Processed Successfully!</span>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <div>Title: {state.result.title}</div>
            <div>Pages: {state.result.pages}</div>
            <div>Text Length: {state.result.extracted_text_length} characters</div>
            {state.result.research_status === 'completed' && (
              <div className="mt-2 font-medium">
                ✅ Research completed! Check the research panel.
              </div>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error: {state.error}
        </div>
      )}
    </div>
  );
}




