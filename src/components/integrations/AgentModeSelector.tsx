import React from 'react';
import { Bot, Zap, Settings } from 'lucide-react';

interface AgentModeSelectorProps {
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
}

export function AgentModeSelector({ selectedMode, onModeChange }: AgentModeSelectorProps) {
  const modes = [
    { id: 'chat', name: 'Chat', icon: Bot, description: 'Conversational AI assistant' },
    { id: 'automation', name: 'Automation', icon: Zap, description: 'Task automation and workflows' },
    { id: 'analysis', name: 'Analysis', icon: Settings, description: 'Data analysis and insights' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-200">Agent Mode</h3>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange?.(mode.id)}
            className={`p-3 rounded-lg border transition-colors text-left ${
              selectedMode === mode.id
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300'
            }`}
          >
            <mode.icon className="h-5 w-5 mb-1" />
            <div className="text-sm font-medium">{mode.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}