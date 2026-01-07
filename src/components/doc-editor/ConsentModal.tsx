/**
 * Consent Modal for Cloud LLM Usage
 * Required before sending documents to cloud APIs
 */

import { useState } from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  fileName: string;
}

export function ConsentModal({ isOpen, onAccept, onReject, fileName }: ConsentModalProps) {
  const [understood, setUnderstood] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-yellow-500/20 p-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="mb-1 text-lg font-semibold text-white">Cloud Processing Consent</h2>
            <p className="text-sm text-slate-400">
              You're about to process <span className="font-medium text-slate-300">{fileName}</span>{' '}
              using a cloud AI service.
            </p>
          </div>
          <button
            onClick={onReject}
            className="text-slate-400 transition-colors hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="space-y-2 rounded-lg bg-slate-800/50 p-4">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div className="text-sm text-slate-300">
                <p className="mb-1 font-medium">What this means:</p>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  <li>Your document will be sent to an external AI service (OpenAI/Anthropic)</li>
                  <li>Files are encrypted during transmission</li>
                  <li>Files are automatically deleted after processing</li>
                  <li>No data is stored permanently by the service</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-xs text-red-300">
              <strong>Warning:</strong> Do not upload sensitive or confidential documents if you're
              concerned about privacy. Use local processing (Ollama) for maximum privacy.
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="consent-understood"
            checked={understood}
            onChange={e => setUnderstood(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800"
          />
          <label htmlFor="consent-understood" className="cursor-pointer text-sm text-slate-300">
            I understand and consent to cloud processing of this document
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!understood}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
