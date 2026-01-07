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
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-full bg-yellow-500/20 p-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">Cloud Processing Consent</h2>
            <p className="text-sm text-slate-400">
              You're about to process <span className="font-medium text-slate-300">{fileName}</span> using a cloud AI service.
            </p>
          </div>
          <button
            onClick={onReject}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-medium mb-1">What this means:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Your document will be sent to an external AI service (OpenAI/Anthropic)</li>
                  <li>Files are encrypted during transmission</li>
                  <li>Files are automatically deleted after processing</li>
                  <li>No data is stored permanently by the service</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-300">
              <strong>Warning:</strong> Do not upload sensitive or confidential documents if you're concerned about privacy. 
              Use local processing (Ollama) for maximum privacy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <input
            type="checkbox"
            id="consent-understood"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800"
          />
          <label htmlFor="consent-understood" className="text-sm text-slate-300 cursor-pointer">
            I understand and consent to cloud processing of this document
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!understood}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

