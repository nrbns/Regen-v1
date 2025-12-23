import React from 'react';

const SHORTCUTS = [
  { keys: 'Cmd+K / Ctrl+K', description: 'Open Command Palette' },
  { keys: 'Cmd+Shift+K / Ctrl+Shift+K', description: 'Open Command Palette (alt)' },
  { keys: '/', description: 'Open Command Bar (when not in input)' },
  { keys: 'Cmd+L / Ctrl+L', description: 'Focus URL bar' },
  { keys: 'Cmd+T / Ctrl+T', description: 'New Tab' },
  { keys: 'Cmd+W / Ctrl+W', description: 'Close Tab' },
  { keys: 'Cmd+Shift+T / Ctrl+Shift+T', description: 'Reopen Closed Tab' },
  { keys: 'Cmd+1-9 / Ctrl+1-9', description: 'Jump to Tab' },
  { keys: 'Cmd+Tab / Ctrl+Tab', description: 'Cycle Tabs' },
  { keys: 'Cmd+Shift+A / Ctrl+Shift+A', description: 'Toggle Agent Console' },
  { keys: 'Cmd+Shift+M / Ctrl+Shift+M', description: 'Toggle Memory Sidebar' },
  { keys: 'Cmd+Shift+R / Ctrl+Shift+R', description: 'Toggle Regen Sidebar' },
  { keys: 'Cmd+Shift+L / Ctrl+Shift+L', description: 'Toggle Unified Side Panel' },
  { keys: 'Cmd+Shift+H / Ctrl+Shift+H', description: 'Highlight Clipper' },
  { keys: 'Alt+Cmd+P / Alt+Ctrl+P', description: 'Proxy Menu' },
  { keys: 'Alt+Cmd+S / Alt+Ctrl+S', description: 'Shields Menu' },
  { keys: 'F11', description: 'Toggle Fullscreen' },
  { keys: 'Esc', description: 'Close modals/overlays/sidebars' },
  { keys: 'Arrow Up/Down', description: 'Navigate Command List' },
  { keys: 'Enter', description: 'Execute Selected Command' },
  { keys: 'Tab', description: 'Complete (if supported)' },
];

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-4 text-xl font-bold text-white">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded px-2 py-1 hover:bg-slate-800/60"
            >
              <span className="font-mono text-sm text-slate-200">{s.keys}</span>
              <span className="text-sm text-slate-400">{s.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
