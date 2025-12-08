/**
 * OCR Processor Component
 * Phase 2, Day 2: OCR for Scanned PDFs
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Languages,
  Eye,
  Download,
} from 'lucide-react';
import {
  ocrPdf,
  ocrImage,
  isScannedPdf,
  getAvailableLanguages,
  type OCRResult,
  type OCRLanguage,
} from '../../core/docs/ocrService';
import { toast } from '../../utils/toast';

interface OCRProcessorProps {
  file: File;
  onComplete?: (result: OCRResult) => void;
  onCancel?: () => void;
}

export function OCRProcessor({ file, onComplete, onCancel }: OCRProcessorProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanned, setIsScanned] = useState<boolean | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<OCRLanguage>('eng');
  const [checkingScan, setCheckingScan] = useState(true);

  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);

  // Phase 2, Day 2: Check if PDF is scanned
  useEffect(() => {
    const checkScanned = async () => {
      if (isPdf) {
        setCheckingScan(true);
        try {
          const scanned = await isScannedPdf(file);
          setIsScanned(scanned);
        } catch (error) {
          console.error('[OCRProcessor] Failed to check if scanned:', error);
          setIsScanned(true); // Assume scanned if check fails
        } finally {
          setCheckingScan(false);
        }
      } else {
        setIsScanned(null);
        setCheckingScan(false);
      }
    };

    checkScanned();
  }, [file, isPdf]);

  // Phase 2, Day 2: Perform OCR
  const handleOCR = async () => {
    if (!isPdf && !isImage) {
      toast.error('File type not supported for OCR');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      let ocrResult: OCRResult;

      if (isPdf) {
        ocrResult = await ocrPdf(file, {
          language: selectedLanguage,
          progressCallback: (p) => setProgress(p),
        });
      } else {
        ocrResult = await ocrImage(file, {
          language: selectedLanguage,
          progressCallback: (p) => setProgress(p),
        });
      }

      setResult(ocrResult);
      toast.success(`OCR completed with ${ocrResult.confidence.toFixed(1)}% confidence`);
      
      if (onComplete) {
        onComplete(ocrResult);
      }
    } catch (error: any) {
      console.error('[OCRProcessor] OCR failed:', error);
      const errorMessage = error?.message || 'OCR failed. Please ensure Tesseract.js is installed.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Phase 2, Day 2: Download extracted text
  const handleDownload = () => {
    if (!result) return;

    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.(pdf|jpg|jpeg|png|gif|bmp|webp)$/i, '_ocr.txt');
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Text downloaded');
  };

  const availableLanguages = getAvailableLanguages();

  if (checkingScan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
          <p className="mt-4 text-gray-400">Checking if PDF is scanned...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-semibold">OCR Processing</h1>
            <p className="text-xs text-gray-400">{file.name}</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 hover:border-slate-600"
          >
            Cancel
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-hidden p-6">
        {/* Status */}
        {isPdf && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              {isScanned ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-yellow-200">Scanned PDF Detected</p>
                    <p className="text-xs text-gray-400">
                      This PDF appears to be scanned. OCR is recommended to extract text.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-200">Text-Based PDF</p>
                    <p className="text-xs text-gray-400">
                      This PDF contains extractable text. OCR may still improve accuracy.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Language Selection */}
        <div className="mb-6 space-y-2">
          <label className="text-sm font-semibold text-gray-300">OCR Language</label>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-gray-400" />
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value as OCRLanguage)}
              disabled={loading}
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {availableLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Select the language(s) in the document for better OCR accuracy
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
            {error.includes('Tesseract.js') && (
              <p className="mt-2 text-xs text-red-300">
                Install Tesseract.js: <code className="rounded bg-red-900/50 px-1">npm install tesseract.js</code>
              </p>
            )}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Processing...</span>
              <span className="font-medium text-purple-400">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
              <div>
                <p className="text-sm font-medium text-emerald-200">OCR Complete</p>
                <p className="text-xs text-gray-400">
                  Confidence: {result.confidence.toFixed(1)}% • {result.words.length} words •{' '}
                  {result.pages.length} page{result.pages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <Download className="h-4 w-4" />
                Download Text
              </button>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/50">
              <div className="border-b border-slate-700 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-300">Extracted Text</h3>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                  {result.text || '(No text extracted)'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!result && (
          <div className="mt-auto">
            <button
              onClick={handleOCR}
              disabled={loading || checkingScan}
              className="w-full rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing OCR...
                </span>
              ) : (
                'Start OCR Processing'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

