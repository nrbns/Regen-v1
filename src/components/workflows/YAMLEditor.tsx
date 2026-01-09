import React, { useState } from 'react';
import { FileText, Save } from 'lucide-react';

interface YAMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export function YAMLEditor({ value, onChange, onSave }: YAMLEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-yellow-400" />
          <span className="font-medium text-slate-200">YAML Editor</span>
        </div>
        <div className="flex items-center space-x-2">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 hover:text-white text-sm"
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-64 bg-slate-900 border border-slate-600 rounded p-3 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter YAML configuration..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}