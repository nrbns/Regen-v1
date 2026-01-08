/**
 * Lite Mode Fallback
 * Lightweight mode when full features fail (low memory, errors, etc.)
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LiteMode() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6 py-12 text-gray-100">
      <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/20 p-2 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-amber-200">Lite Mode Activated</h1>
            <p className="mt-2 text-sm text-gray-400">
              RegenBrowser detected limited resources and switched to Lite Mode for better
              performance.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Some features (AI vision, heavy tabs) are disabled. Core browsing still works.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleReload}
            className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:border-blue-500/70"
          >
            <RefreshCw className="mr-2 inline h-4 w-4" />
            Reload Full Mode
          </button>
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          <p>Lite Mode Features:</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>Basic browsing (no AI features)</li>
            <li>Tab management (limited to 5 tabs)</li>
            <li>Search (text-only, no voice)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
