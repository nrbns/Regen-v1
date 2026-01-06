import React from 'react';

export function WhisperStrip({ active = false }: { active?: boolean }) {
  // Always render the whisper control button for accessibility. When active=true,
  // show an expanded strip message; otherwise render a compact control bar.
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900 p-2 text-sm text-gray-300">
      <div className="mx-auto max-w-3xl flex items-center justify-between">
        <div className="text-left">{active ? 'Whisper: (disabled in v1-mode)' : ''}</div>
        <div className="ml-4">
          <button className="rounded bg-white/6 px-3 py-1 text-sm text-white" aria-label="Hold to speak">
            Hold to speak
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhisperStrip;