/**
 * Agents Panel Component
 * Main panel displaying all available agents with status and actions
 */

import { useState } from 'react';
import { Bot, Search } from 'lucide-react';
import { AgentCard, type AgentStatus } from './AgentCard';
import { AgentExecutionDisplay } from './AgentExecutionDisplay';
import { ResponsiveCard } from '../common/ResponsiveCard';
import { cn } from '../../lib/utils';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  progress?: number;
  steps?: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    duration?: number;
  }>;
  result?: {
    type: 'success' | 'error' | 'partial';
    message: string;
    data?: unknown;
  };
}

export interface AgentsPanelProps {
  agents?: Agent[];
  onRunAgent?: (agentId: string) => void;
  onPauseAgent?: (agentId: string) => void;
  onCancelAgent?: (agentId: string) => void;
  onViewResult?: (agentId: string) => void;
  className?: string;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Search, analyze, and summarize information from multiple sources',
    status: 'idle',
  },
  {
    id: 'summarize',
    name: 'Summarize Agent',
    description: 'Generate concise summaries of articles and documents',
    status: 'idle',
  },
  {
    id: 'translate',
    name: 'Translate Agent',
    description: 'Translate text between multiple languages',
    status: 'idle',
  },
];

export function AgentsPanel({
  agents = DEFAULT_AGENTS,
  onRunAgent,
  onPauseAgent,
  onCancelAgent,
  onViewResult,
  className,
}: AgentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedAgent, _setSelectedAgent] = useState<string | null>(null);
  const [executingAgent, setExecutingAgent] = useState<{
    id: string;
    query: string;
    steps: Array<{
      id: string;
      name: string;
      status: 'pending' | 'running' | 'completed' | 'error';
      duration?: number;
    }>;
    progress?: number;
    result?: {
      type: 'success' | 'error' | 'partial';
      data?: unknown;
      message?: string;
    };
  } | null>(null);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRun = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setExecutingAgent({
      id: agentId,
      query: `Running ${agent.name}...`,
      steps: [
        { id: '1', name: 'Initializing', status: 'running' },
        { id: '2', name: 'Processing', status: 'pending' },
        { id: '3', name: 'Finalizing', status: 'pending' },
      ],
      progress: 0,
    });

    if (onRunAgent) {
      onRunAgent(agentId);
    }
  };

  const handleCancel = () => {
    if (executingAgent && onCancelAgent) {
      onCancelAgent(executingAgent.id);
    }
    setExecutingAgent(null);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Agents</h1>
            <p className="text-sm text-slate-400">AI-powered agents for automation and assistance</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Active Execution */}
        {executingAgent && (
          <div className="mb-6">
            <AgentExecutionDisplay
              agentName={agents.find(a => a.id === executingAgent.id)?.name || 'Agent'}
              query={executingAgent.query}
              steps={executingAgent.steps}
              overallProgress={executingAgent.progress}
              result={executingAgent.result}
              onCancel={handleCancel}
              onDismiss={() => setExecutingAgent(null)}
            />
          </div>
        )}

        {/* Agents Grid */}
        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                {...agent}
                onRun={() => handleRun(agent.id)}
                onPause={onPauseAgent ? () => onPauseAgent(agent.id) : undefined}
                onCancel={onCancelAgent ? () => onCancelAgent(agent.id) : undefined}
                onViewResult={onViewResult ? () => onViewResult(agent.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <ResponsiveCard className="text-center py-12">
            <Bot size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No agents found</p>
          </ResponsiveCard>
        )}
      </div>
    </div>
  );
}


