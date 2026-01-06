// OmniAgentInput deferred for v1 — original in src/_deferred/omni-mode/OmniAgentInput.tsx
export function OmniAgentInput(_props: any) {
  return null;
}

export default OmniAgentInput;
/**
 * OmniAgent Input - Tier 2
 * "Ask OmniAgent" input in Research Mode
 */

import { useState } from 'react';
import { Send, Loader2, Sparkles, Zap, Grid3x3, GitBranch } from 'lucide-react';
import { runAgent, type AgentTask } from '../../agent/runAgent';
import { executeAgentGoal, getAgentAudit } from '../../core/agent/integration';
import { toast } from '../../utils/toast';
import { validateUrlForAgent } from '../../core/security/urlSafety';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';
import { AgentAuditModal } from '../agent/AgentAuditModal';
import { AgentRecommendations } from '../agent/AgentRecommendations';
import { AgentTemplateSelector } from '../agent/AgentTemplateSelector';
import { AgentBatchProcessor } from '../agent/AgentBatchProcessor';
import { WorkflowTemplateBrowser } from '../agent/WorkflowTemplateBrowser';
import { useBatchStore } from '../../core/agent/batch';
import type { WorkflowStep } from '../../core/agent/workflows';

interface OmniAgentInputProps {
  currentUrl?: string;
  onResult?: (result: {
    type: string;
    content: string;
    sources?: Array<{ url: string; title: string }>;
  }) => void;
}

export function OmniAgentInput({ currentUrl, onResult }: OmniAgentInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireConsent, setRequireConsent] = useState(true);
  const [allowedDomainsInput, setAllowedDomainsInput] = useState('');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditRunId, setAuditRunId] = useState<string | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [batchProcessorOpen, setBatchProcessorOpen] = useState(false);
  const [workflowBrowserOpen, setWorkflowBrowserOpen] = useState(false);
  const recordAgentAudit = useTrustDashboardStore(state => state.recordAgentAudit);
  const createJob = useBatchStore(state => state.createJob);
  const addTaskToJob = useBatchStore(state => state.addTaskToJob);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      // Tier 3: Use new agent planner for complex goals
      let result;

      // Check if it's a complex multi-step goal
      const isComplexGoal =
        query.toLowerCase().includes('research') &&
        (query.toLowerCase().includes('compare') ||
          query.toLowerCase().includes('save') ||
          query.toLowerCase().includes('workspace'));

      if (isComplexGoal) {
        // Use new agent graph system
        const runId = `agent-run-${Date.now()}`;
        const safetyContext = buildSafetyContext(currentUrl, allowedDomainsInput, requireConsent);

        result = await executeAgentGoal(query, {
          runId,
          safety: safetyContext,
        });
        if (result && typeof result === 'object' && 'audit' in result && 'runId' in result) {
          const auditData = (result as any).audit || [];
          recordAgentAudit(runId, auditData);
          setAuditRunId(runId);
          setAuditModalOpen(true);
        }
        onResult?.({
          type: 'complex_plan',
          content: formatComplexResult(result),
          sources: [],
        });
      } else {
        // Use simple agent for quick tasks
        let task: AgentTask;

        if (
          currentUrl &&
          (query.toLowerCase().includes('explain') || query.toLowerCase().includes('this page'))
        ) {
          const validation = validateUrlForAgent(currentUrl);
          if (!validation.safe) {
            toast.error(validation.reason || 'Unsafe URL');
            setLoading(false);
            return;
          }
          task = { type: 'explain_page', url: currentUrl };
        } else if (query.toLowerCase().includes('compare') && query.includes('http')) {
          const urlMatches = query.match(/https?:\/\/[^\s]+/g) || [];
          if (urlMatches.length >= 2) {
            const validation = urlMatches.every(url => validateUrlForAgent(url).safe);
            if (!validation) {
              toast.error('One or more URLs are unsafe');
              setLoading(false);
              return;
            }
            task = { type: 'compare_urls', urls: urlMatches };
          } else {
            task = { type: 'deep_research', topic: query };
          }
        } else if (query.toLowerCase().includes('research') || query.length > 50) {
          task = { type: 'deep_research', topic: query };
        } else if (currentUrl) {
          const validation = validateUrlForAgent(currentUrl);
          if (!validation.safe) {
            toast.error(validation.reason || 'Unsafe URL');
            setLoading(false);
            return;
          }
          task = { type: 'quick_summary', url: currentUrl };
        } else {
          task = { type: 'deep_research', topic: query };
        }

        result = await runAgent(task);
        onResult?.(result);
      }

      toast.success('OmniAgent completed!');
    } catch (error) {
      console.error('OmniAgent error', error);
      toast.error(error instanceof Error ? error.message : 'OmniAgent failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSubmit = async (goal: string, safety: any) => {
    setQuery(goal);
    setLoading(true);
    
    try {
      const runId = `agent-run-${Date.now()}`;
      const result = await executeAgentGoal(goal, {
        runId,
        safety,
      });
      
      if (result && typeof result === 'object' && 'audit' in result) {
        recordAgentAudit(runId, (result as any).audit || []);
        setAuditRunId(runId);
        setAuditModalOpen(true);
      }
      
      onResult?.({
        type: 'complex_plan',
        content: formatComplexResult(result),
        sources: [],
      });
      
      toast.success('Template research completed!');
    } catch (error) {
      console.error('Template research error', error);
      toast.error(error instanceof Error ? error.message : 'Template research failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowExecute = async (steps: WorkflowStep[], templateId: string) => {
    try {
      const jobId = createJob(`Workflow: ${templateId}`);
      
      // Convert workflow steps to batch tasks
      steps.forEach((step) => {
        addTaskToJob(jobId, step.content);
      });
      
      setBatchProcessorOpen(true);
      toast.success(`Workflow "${templateId}" added to batch processor`);
    } catch (error) {
      console.error('Workflow execution error', error);
      toast.error('Failed to add workflow to batch processor');
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/50 p-4">
      {auditRunId && (
        <AgentAuditModal
          runId={auditRunId}
          entries={getAgentAudit(auditRunId) || []}
          visible={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
        />
      )}
      
      {templateSelectorOpen && (
        <AgentTemplateSelector
          onSubmit={handleTemplateSubmit}
          onClose={() => setTemplateSelectorOpen(false)}
        />
      )}

      {workflowBrowserOpen && (
        <WorkflowTemplateBrowser
          onExecute={handleWorkflowExecute}
          onClose={() => setWorkflowBrowserOpen(false)}
        />
      )}

      {batchProcessorOpen && (
        <AgentBatchProcessor
          onExecute={async (goal: string) => {
            const runId = `agent-run-${Date.now()}`;
            const result = await executeAgentGoal(goal, { runId });
            if (result && typeof result === 'object' && 'audit' in result) {
              recordAgentAudit(runId, (result as any).audit || []);
            }
            return result;
          }}
          onClose={() => setBatchProcessorOpen(false)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
          <Sparkles size={14} />
          <span>Ask OmniAgent</span>
        </div>
        <div className="flex gap-2">
          <input
            id="omni-agent-query"
            name="omni-agent-query"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              currentUrl
                ? 'Explain this page, research a topic, or compare URLs...'
                : 'Research a topic, compare URLs, or ask a question...'
            }
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Processing...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span className="text-xs">Ask</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTemplateSelectorOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Use a pre-configured research template"
          >
            <Zap size={14} />
            <span className="text-xs">Templates</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkflowBrowserOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Run a multi-step research workflow"
          >
            <GitBranch size={14} />
            <span className="text-xs">Workflows</span>
          </button>
          <button
            type="button"
            onClick={() => setBatchProcessorOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Run multiple research tasks in parallel"
          >
            <Grid3x3 size={14} />
            <span className="text-xs">Batch</span>
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-xs text-gray-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-900"
              checked={requireConsent}
              onChange={e => setRequireConsent(e.target.checked)}
            />
            Require consent for risky steps
          </label>
          <div className="flex flex-col gap-1">
            <span>Allowed domains (comma-separated)</span>
            <input
              type="text"
              value={allowedDomainsInput}
              onChange={e => setAllowedDomainsInput(e.target.value)}
              placeholder={currentUrl ? tryHostname(currentUrl) : 'example.com, docs.example.com'}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Examples: "Explain this page", "Research benefits of intermittent fasting", "Compare
          https://example.com and https://example.org"
        </div>
      </form>

      {/* Agent Recommendations */}
      <div className="mt-6 border-t border-slate-800 pt-4">
        <AgentRecommendations />
      </div>
    </div>
  );
}

function buildSafetyContext(currentUrl?: string, allowedDomainsInput?: string, requireConsent = true) {
  const allowedDomains = allowedDomainsInput
    ?.split(',')
    .map(d => d.trim())
    .filter(Boolean);

  if (allowedDomains && allowedDomains.length > 0) {
    return { allowedDomains, requireConsent };
  }

  if (currentUrl) {
    try {
      const { hostname } = new URL(currentUrl);
      return {
        allowedDomains: [hostname],
        requireConsent,
      };
    } catch {
      /* fall through */
    }
  }

  return { requireConsent };
}

function tryHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'example.com';
  }
}

function formatComplexResult(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'finalOutput' in (result as any)) {
    const output = (result as any).finalOutput;
    if (typeof output === 'string') return output;
    try {
      return JSON.stringify(output ?? result, null, 2);
    } catch {
      return '[unserializable result]';
    }
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return '[unserializable result]';
  }
}
