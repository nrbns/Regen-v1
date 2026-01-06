import React from 'react';
import { Loader } from 'lucide-react';

/**
 * LAG FIX #1: Professional loading fallback with spinner
 * Replaced simple "Loading..." with smooth animation and gradient backgrounds
 */
export function AppLoadingFallback() {
  return (
    <div role="region" aria-label="Loading fallback" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#111422] to-[#0a0e27]">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo/Icon */}
        <div className="flex items-center justify-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 opacity-20 blur" />
            <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
              <Loader className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold text-white">Regen Browser</h2>
          <p className="text-sm text-gray-400">AI-powered web automation platform</p>
        </div>

        {/* Progress indicator */}
        <div className="w-48 space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_auto]" />
          </div>
          <p className="text-center text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    </div>
  );
}
