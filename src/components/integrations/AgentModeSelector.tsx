/**
 * Agent Mode Selector Component
 * Integrates multi-agent system into UI
 */

import { useState, useEffect } from 'react';
import { multiAgentSystem, type AgentMode } from '../../core/agents/multiAgentSystem';
import { Sparkles, TrendingUp, Code, FileText, Workflow } from 'lucide-react';

const AGENT_MODES: Array<{
  id: AgentMode;
  label: string;
  icon: typeof Sparkles;
  description: string;
}> = [
  {
    id: 'trade',
    label: 'Trade',
    icon: TrendingUp,
    description: 'Market analysis, signals, order execution',
  },
  {
    id: 'research',
    label: 'Research',
    icon: Sparkles,
    description: 'Multi-source search, citations, verification',
  },
  {
    id: 'dev',
    label: 'Dev',
    icon: Code,
    description: 'Code extraction, auto-debug, profiling',
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    description: 'PDF/Doc insights, table extraction',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: Workflow,
    description: 'Arc-like automated workflows',
  },
];

interface AgentModeSelectorProps {
  onAgentSelect?: (mode: AgentMode, capabilities: string[]) => void;
  defaultMode?: AgentMode;
}

export function AgentModeSelector({
  onAgentSelect,
  defaultMode = 'research',
}: AgentModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<AgentMode>(defaultMode);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  useEffect(() => {
    const caps = multiAgentSystem.getCapabilities(selectedMode, {
      mode: selectedMode,
    });
    setCapabilities(caps);
    onAgentSelect?.(selectedMode, caps);
  }, [selectedMode, onAgentSelect]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {AGENT_MODES.map(mode => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'
              } `}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {capabilities.length > 0 && (
        <div className="rounded-lg bg-neutral-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-300">Capabilities</h3>
          <ul className="flex flex-wrap gap-2">
            {capabilities.map(cap => (
              <li
                key={cap}
                className="rounded-full bg-neutral-700/50 px-3 py-1 text-xs text-neutral-400"
              >
                {cap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}







