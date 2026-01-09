import React from 'react';
import { Keyboard } from 'lucide-react';

export function ShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl+K', description: 'Open command mode' },
    { key: 'Ctrl+T', description: 'New tab' },
    { key: 'Ctrl+W', description: 'Close tab' },
    { key: 'Ctrl+R', description: 'Refresh page' },
    { key: 'Ctrl+L', description: 'Focus address bar' },
    { key: 'F11', description: 'Toggle fullscreen' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Keyboard className="h-5 w-5 text-green-400" />
        <h3 className="text-lg font-semibold text-slate-200">Keyboard Shortcuts</h3>
      </div>

      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0">
            <span className="text-slate-300">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-sm font-mono">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}