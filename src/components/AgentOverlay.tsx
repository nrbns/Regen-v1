/**
 * AgentOverlay - Enhanced floating right panel with full tabs
 * Tabs: Plan, Actions, Logs, Memory, Ledger
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Square,
  Clock,
  Zap,
  FileText,
  Shield,
  Brain,
  ScrollText,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquareText,
  ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIPCEvent } from '../lib/use-ipc-event';
import { ipc } from '../lib/ipc-typed';
import { getEnvVar, isElectronRuntime } from '../lib/env';
import { useAgentStreamStore, StreamStatus, AgentStreamEvent } from '../state/agentStreamStore';

type TabType = 'responses' | 'plan' | 'actions' | 'logs' | 'memory' | 'ledger';

interface AgentStep {
  id: string;
  tool: string;
  args: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: number;
}

const STATUS_LABELS: Record<StreamStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  live: 'Streaming',
  complete: 'Complete',
  error: 'Error',
};

const STATUS_STYLES: Record<StreamStatus, string> = {
  idle: 'bg-slate-800/60 text-slate-300',
  connecting: 'border border-blue-500/40 bg-blue-500/20 text-blue-100',
  live: 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
  complete: 'border border-purple-500/40 bg-purple-500/20 text-purple-100',
  error: 'border border-rose-500/40 bg-rose-500/20 text-rose-100',
};

const SparkleTrail = () => (
  <span className="flex items-center gap-1 text-purple-300/80">
    <Sparkles size={14} />
  </span>
);

const LoaderDots = () => (
  <span className="flex items-center gap-1">
    {[0, 0.2, 0.4].map(delay => (
      <motion.span
        key={delay}
        className="h-1.5 w-1.5 rounded-full bg-blue-200/80"
        animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, delay }}
      />
    ))}
  </span>
);

interface AgentPlan {
  taskId: string;
  steps: Array<{ id: string; description: string; tool?: string }>;
  goal: string;
  budget: { tokens: number; seconds: number; requests: number };
  remaining: { tokens: number; seconds: number; requests: number };
}

interface ConsentEntry {
  id: string;
  timestamp: number;
  action: {
    type: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
  };
  approved: boolean;
  origin: string;
}

export function AgentOverlay() {
  const [isActive, setIsActive] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('responses');
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [actions, setActions] = useState<AgentStep[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [consentLedger, setConsentLedger] = useState<ConsentEntry[]>([]);
  const [memory, setMemory] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const [requests, setRequests] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const isElectron = useMemo(() => isElectronRuntime(), []);
  const apiBaseUrl = useMemo(
    () =>
      getEnvVar('API_BASE_URL') ??
      getEnvVar('OMNIBROWSER_API_URL') ??
      getEnvVar('OB_API_BASE_URL') ??
      null,
    []
  );
  const eventSourceRef = useRef<EventSource | null>(null);
  const runId = useAgentStreamStore(state => state.runId);
  const streamStatus = useAgentStreamStore(state => state.status);
  const streamError = useAgentStreamStore(state => state.error);
  const streamTranscript = useAgentStreamStore(state => state.transcript);
  const streamEvents = useAgentStreamStore(state => state.events);
  const lastGoal = useAgentStreamStore(state => state.lastGoal);
  const setRun = useAgentStreamStore(state => state.setRun);
  const setStreamStatus = useAgentStreamStore(state => state.setStatus);
  const setStreamError = useAgentStreamStore(state => state.setError);
  const appendStreamEvent = useAgentStreamStore(state => state.appendEvent);
  const appendTranscript = useAgentStreamStore(state => state.appendTranscript);
  const resetAgentStream = useAgentStreamStore(state => state.reset);

  const appendMessage = useCallback(
    (text: string) => {
      const current = useAgentStreamStore.getState().transcript;
      appendTranscript(current ? `\n${text}` : text);
    },
    [appendTranscript]
  );

  const pushStreamEvent = useCallback(
    (event: Partial<AgentStreamEvent> & { type: AgentStreamEvent['type'] }) => {
      const timestamp = event.timestamp ?? Date.now();
      const id = event.id ?? `${event.type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      appendStreamEvent({ id, timestamp, ...event } as AgentStreamEvent);
    },
    [appendStreamEvent]
  );

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const resetStream = useCallback(() => {
    stopStream();
    resetAgentStream();
  }, [stopStream, resetAgentStream]);

  const startStream = useCallback(
    async (goal: string, planId?: string) => {
      if (!apiBaseUrl) {
        setStreamStatus('error');
        setStreamError('API_BASE_URL environment variable is not configured.');
        return;
      }

      stopStream();
      resetAgentStream();

      try {
        const response = await fetch(`${apiBaseUrl}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal, plan_id: planId }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Agent API responded with status ${response.status}`);
        }

        const payload = await response.json();
        const newRunId: string | undefined = payload?.id || payload?.run_id || payload?.runId;
        if (!newRunId) {
          throw new Error('Agent API did not return a run identifier.');
        }

        setRun(newRunId, goal ?? null);
        setStreamStatus('live');

        const source = new EventSource(`${apiBaseUrl}/agent/runs/${newRunId}`);
        eventSourceRef.current = source;

        source.onmessage = event => {
          if (!event.data) return;
          try {
            const data = JSON.parse(event.data);
            const timestamp = Date.now();

            if (typeof data.delta === 'string' && data.delta.length > 0) {
              appendTranscript(data.delta);
            }

            if (typeof data.message === 'string' && data.message.length > 0) {
              appendMessage(data.message);
              pushStreamEvent({ type: 'log', content: data.message, timestamp });
            }

            if (data.type === 'start') {
              pushStreamEvent({ type: 'start', timestamp });
            }

            if (data.type === 'step') {
              pushStreamEvent({
                type: 'step',
                step: data.step,
                status: data.status,
                content: data.log || data.message,
                timestamp,
              });
            }

            if (data.type === 'consent') {
              pushStreamEvent({
                type: 'consent',
                content: data.description,
                risk: data.risk,
                approved: data.approved,
                timestamp,
              });
            }

            if (data.type === 'done') {
              pushStreamEvent({ type: 'done', timestamp });
              setStreamStatus('complete');
              source.close();
              eventSourceRef.current = null;
            }

            if (typeof data.tokens === 'number') {
              setTokens(prev => prev + data.tokens);
            }

            if (data.type === 'step') {
              setRequests(prev => prev + 1);
            }
          } catch (error) {
            console.warn('[agent] Unable to parse stream payload', error);
          }
        };

        source.onerror = () => {
          setStreamStatus('error');
          setStreamError('Agent stream disconnected.');
          pushStreamEvent({ type: 'error', content: 'Stream disconnected', timestamp: Date.now() });
          source.close();
          eventSourceRef.current = null;
        };
      } catch (error) {
        console.error('[agent] Failed to start agent stream', error);
        setStreamStatus('error');
        setStreamError(error instanceof Error ? error.message : 'Failed to start agent run');
      }
    },
    [
      apiBaseUrl,
      appendTranscript,
      appendMessage,
      pushStreamEvent,
      setRun,
      setStreamError,
      setStreamStatus,
      stopStream,
    ]
  );

  // Listen for agent events
  useIPCEvent<AgentPlan>(
    'agent:plan',
    data => {
      resetStream();
      setIsActive(true);
      setActiveTab('responses');
      setPlan(data);
      setStartTime(Date.now());
      setTokens(0);
      setRequests(0);
      setLogs([]);
      setActions([]);
      setConsentLedger([]);
      setMemory([]);
      pushStreamEvent({ type: 'start', timestamp: Date.now() });
      if (isElectron) {
        setStreamStatus('live');
      }
    },
    [resetStream, pushStreamEvent, isElectron, setStreamStatus]
  );

  useIPCEvent(
    'agent:step',
    (data: any) => {
      const stepId = data.stepId || data.id;
      setCurrentStep(stepId);

      if (data.tool) {
        const step: AgentStep = {
          id: stepId || crypto.randomUUID(),
          tool: data.tool,
          args: data.args || {},
          result: data.result,
          status: data.status || 'running',
          timestamp: data.timestamp || Date.now(),
        };
        setActions(prev => {
          const existing = prev.findIndex(s => s.id === step.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = step;
            return updated;
          }
          return [...prev, step];
        });
      }

      if (data.log) {
        const message = `[${new Date().toLocaleTimeString()}] ${data.log}`;
        setLogs(prev => [...prev, message]);
        appendMessage(data.log);
        pushStreamEvent({
          type: 'log',
          content: data.log,
          timestamp: data.timestamp || Date.now(),
        });
      }
      if (data.tokens) {
        setTokens(prev => prev + data.tokens);
      }
      setRequests(prev => prev + 1);
      if (data.status) {
        pushStreamEvent({
          type: 'step',
          step: data.sequence ?? data.step ?? undefined,
          status: data.status,
          content: data.log || data.tool || data.status,
          timestamp: data.timestamp || Date.now(),
        });
        if (streamStatus === 'idle') {
          setStreamStatus('live');
        }
      }
    },
    [streamStatus, pushStreamEvent, appendMessage]
  );

  useIPCEvent(
    'agent:log',
    (data: any) => {
      if (data.message) {
        const message = `[${new Date().toLocaleTimeString()}] ${data.message}`;
        setLogs(prev => [...prev, message]);
        appendMessage(data.message);
        pushStreamEvent({
          type: 'log',
          content: data.message,
          timestamp: data.timestamp || Date.now(),
        });
      }
    },
    [appendMessage, pushStreamEvent]
  );

  useIPCEvent(
    'agent:consent:request',
    (data: any) => {
      if (data.entry) {
        setConsentLedger(prev => [...prev, data.entry]);
        pushStreamEvent({
          type: 'consent',
          content: data.entry.action?.description,
          risk: data.entry.action?.risk,
          approved: data.entry.approved !== false,
          timestamp: data.entry.timestamp || Date.now(),
        });
      }
    },
    [pushStreamEvent]
  );

  useIPCEvent(
    'agent:memory',
    (data: any) => {
      if (data.memory) {
        setMemory(prev => [...prev, data.memory]);
      }
    },
    []
  );

  useIPCEvent(
    'agent:complete',
    () => {
      setStreamStatus('complete');
      stopStream();
      setCurrentStep(null);
    },
    [setStreamStatus, stopStream]
  );

  useEffect(() => {
    if (!isActive) {
      stopStream();
    }
  }, [isActive, stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (!isActive) return;
    if (!plan?.goal) return;
    if (isElectron) return;
    if (!apiBaseUrl) {
      setStreamStatus('error');
      setStreamError('API_BASE_URL environment variable is not configured.');
      return;
    }
    if (lastGoal === plan.goal && streamStatus !== 'error') return;
    void startStream(plan.goal, plan.taskId);
  }, [
    isActive,
    plan?.goal,
    plan?.taskId,
    isElectron,
    apiBaseUrl,
    startStream,
    setStreamError,
    setStreamStatus,
    lastGoal,
    streamStatus,
  ]);

  useEffect(() => {
    // Load consent ledger from consent API
    const loadLedger = async () => {
      try {
        const ledger = (await ipc.consent.list()) as any;
        if (Array.isArray(ledger)) {
          setConsentLedger(
            ledger.map((entry: any) => ({
              id: entry.id?.toString() || crypto.randomUUID(),
              timestamp: entry.timestamp || Date.now(),
              action: {
                type: entry.action?.type || 'unknown',
                description: entry.action?.description || 'Unknown action',
                risk: entry.action?.risk || 'medium',
              },
              approved: entry.approved !== false,
              origin: entry.origin || 'agent',
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load ledger:', error);
      }
    };
    if (isActive && activeTab === 'ledger') {
      loadLedger();
    }
  }, [isActive, activeTab]);

  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  if (!isActive) return null;

  const tabs = [
    { id: 'responses' as TabType, label: 'Responses', icon: MessageSquareText },
    { id: 'plan' as TabType, label: 'Plan', icon: FileText },
    { id: 'actions' as TabType, label: 'Actions', icon: Zap },
    { id: 'logs' as TabType, label: 'Logs', icon: ScrollText },
    { id: 'memory' as TabType, label: 'Memory', icon: Brain },
    { id: 'ledger' as TabType, label: 'Ledger', icon: Shield },
  ];

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed bottom-0 right-0 top-0 z-50 flex w-96 flex-col border-l border-gray-700/50 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="border-b border-gray-700/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-400" size={20} />
            <h3 className="font-semibold text-gray-200">Agent Console</h3>
          </div>
          <button
            onClick={() => {
              stopStream();
              setIsActive(false);
            }}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <Square size={16} />
          </button>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-gray-800/50 p-2">
            <div className="mb-1 flex items-center gap-1 text-gray-400">
              <Zap size={12} />
              <span>Tokens</span>
            </div>
            <div className="font-mono text-gray-200">{tokens.toLocaleString()}</div>
            {plan?.remaining && (
              <div className="text-xs text-gray-500">/ {plan.remaining.tokens}</div>
            )}
          </div>
          <div className="rounded bg-gray-800/50 p-2">
            <div className="mb-1 flex items-center gap-1 text-gray-400">
              <Clock size={12} />
              <span>Time</span>
            </div>
            <div className="font-mono text-gray-200">{elapsedTime}s</div>
            {plan?.budget && <div className="text-xs text-gray-500">/ {plan.budget.seconds}s</div>}
          </div>
          <div className="rounded bg-gray-800/50 p-2">
            <div className="mb-1 flex items-center gap-1 text-gray-400">
              <FileText size={12} />
              <span>Requests</span>
            </div>
            <div className="font-mono text-gray-200">{requests}</div>
            {plan?.remaining && (
              <div className="text-xs text-gray-500">/ {plan.remaining.requests}</div>
            )}
          </div>
        </div>

        {/* Dry-run Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="dryrun"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="dryrun" className="text-xs text-gray-400">
            Dry-run mode
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-700/50">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-400 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'responses' && (
            <motion.div
              key="responses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${STATUS_STYLES[streamStatus]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {STATUS_LABELS[streamStatus]}
                </span>
                {runId && (
                  <span className="font-mono text-[11px] text-gray-500">
                    Run #{runId.slice(-6)}
                  </span>
                )}
                {!isElectron && !apiBaseUrl && (
                  <span className="text-[11px] text-amber-300">
                    Set API_BASE_URL to enable live streaming outside Electron.
                  </span>
                )}
              </div>

              {streamTranscript && (
                <div className="whitespace-pre-wrap rounded-lg border border-slate-700/60 bg-slate-900/70 p-3 text-sm text-slate-200">
                  {streamTranscript}
                </div>
              )}

              {streamError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                  {streamError}
                </div>
              )}

              <div className="space-y-3">
                {streamEvents.map((event: AgentStreamEvent) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span>{event.type}</span>
                      <span>
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    {event.content && (
                      <div className="mt-2 whitespace-pre-wrap text-slate-200">{event.content}</div>
                    )}
                    {event.type === 'consent' && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                        <ShieldAlert
                          size={14}
                          className={
                            event.risk === 'high'
                              ? 'text-rose-400'
                              : event.risk === 'medium'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }
                        />
                        <span>
                          {event.approved ? 'Approved' : 'Denied'}
                          {event.risk ? ` • ${event.risk.toUpperCase()}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {streamEvents.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-700/60 bg-slate-900/50 p-4 text-xs text-slate-400">
                    {streamStatus === 'connecting' && 'Connecting to Redix agent…'}
                    {streamStatus === 'live' && 'Awaiting first tokens from the agent…'}
                    {streamStatus === 'complete' && 'Run complete. Review the transcript above.'}
                    {streamStatus === 'idle' &&
                      'Trigger an agent action to see responses in real time.'}
                    {streamStatus === 'error' && (streamError || 'Agent stream unavailable.')}
                  </div>
                )}
              </div>

              {consentLedger.length > 0 && (
                <div className="pt-2">
                  <h4 className="mb-2 text-sm font-semibold text-gray-300">
                    Recent consent checks
                  </h4>
                  <div className="space-y-2 text-xs text-slate-300">
                    {consentLedger.slice(-5).map(entry => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">{entry.action.description}</span>
                          <span
                            className={`font-medium ${entry.approved ? 'text-emerald-300' : 'text-rose-300'}`}
                          >
                            {entry.approved ? 'Approved' : 'Denied'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{entry.action.type}</span>
                          <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'plan' && plan && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-300">Goal</h4>
                <p className="text-sm text-gray-400">{plan.goal}</p>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-300">Budget</h4>
                <div className="space-y-1 rounded bg-gray-800/50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens:</span>
                    <span className="text-gray-200">
                      {plan.remaining.tokens} / {plan.budget.tokens}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time:</span>
                    <span className="text-gray-200">
                      {plan.remaining.seconds}s / {plan.budget.seconds}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requests:</span>
                    <span className="text-gray-200">
                      {plan.remaining.requests} / {plan.budget.requests}
                    </span>
                  </div>
                </div>
              </div>

              {plan.steps.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <SparkleTrail />
                    Redix thinking
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {plan.steps.map((step, idx) => {
                      const action = actions.find(a => a.id === step.id);
                      let status: 'pending' | 'running' | 'completed' | 'error' = 'pending';
                      if (action?.status === 'completed') status = 'completed';
                      else if (action?.status === 'error') status = 'error';
                      else if (action?.status === 'running' || currentStep === step.id)
                        status = 'running';

                      return (
                        <motion.div
                          key={`bubble-${step.id}`}
                          className="flex flex-col items-center gap-1"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div
                            className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
                              status === 'completed'
                                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                : status === 'error'
                                  ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
                                  : status === 'running'
                                    ? 'border-blue-400/70 bg-blue-500/15 text-blue-100'
                                    : 'border-slate-600/70 bg-slate-800/60 text-slate-300'
                            } ${status === 'pending' ? 'opacity-70' : ''}`}
                          >
                            {status === 'running' && (
                              <motion.div
                                className="absolute inset-[3px] rounded-full bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-blue-400/40"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                              />
                            )}
                            <span className="relative z-10 text-xs font-semibold text-white/90">
                              {idx + 1}
                            </span>
                          </div>
                          <span className="line-clamp-2 w-20 text-center text-[10px] text-gray-400">
                            {step.tool || step.description}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-300">
                  Steps ({plan.steps.length})
                </h4>
                <div className="space-y-2">
                  {plan.steps.map((step, idx) => {
                    const isCurrent = step.id === currentStep;
                    const action = actions.find(a => a.id === step.id);
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`rounded-lg border p-3 ${
                          isCurrent
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : action?.status === 'completed'
                              ? 'border-green-500/30 bg-green-500/5'
                              : action?.status === 'error'
                                ? 'border-red-500/30 bg-red-500/5'
                                : 'border-gray-700/50 bg-gray-800/30'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">#{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-200">
                            {step.tool || step.description}
                          </span>
                          {isCurrent && (
                            <motion.div
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="h-2 w-2 rounded-full bg-blue-400"
                            />
                          )}
                          {action?.status === 'completed' && (
                            <CheckCircle2 size={14} className="text-green-400" />
                          )}
                          {action?.status === 'error' && (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </div>
                        {step.description && (
                          <div className="mt-1 text-xs text-gray-400">{step.description}</div>
                        )}
                        {action?.result && (
                          <div className="mt-2 truncate font-mono text-xs text-gray-500">
                            {JSON.stringify(action.result).slice(0, 100)}...
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'actions' && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {actions.length === 0 ? (
                <div className="space-y-2">
                  {plan?.steps.slice(0, 3).map(step => (
                    <div
                      key={`skeleton-${step.id}`}
                      className="overflow-hidden rounded-lg border border-blue-500/30 bg-blue-500/5 p-3"
                    >
                      <div className="mb-2 flex items-center gap-2 text-sm text-blue-200/80">
                        <div className="h-2 w-2 animate-ping rounded-full bg-blue-400/80" />
                        <span>{step.tool || step.description}</span>
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-blue-100/70">
                        <div className="h-1.5 w-full animate-pulse rounded bg-blue-300/30" />
                        <div className="h-1.5 w-3/4 animate-pulse rounded bg-blue-300/20" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 py-3 text-xs text-blue-200/80">
                    <LoaderDots />
                    Waiting for Redix to execute actions…
                  </div>
                </div>
              ) : (
                actions.map(action => (
                  <div
                    key={action.id}
                    className={`rounded-lg border p-3 ${
                      action.status === 'completed'
                        ? 'border-green-500/30 bg-green-500/5'
                        : action.status === 'error'
                          ? 'border-red-500/30 bg-red-500/5'
                          : action.status === 'running'
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-gray-700/50 bg-gray-800/30'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{action.tool}</span>
                      {action.status === 'completed' && (
                        <CheckCircle2 size={14} className="text-green-400" />
                      )}
                      {action.status === 'error' && <XCircle size={14} className="text-red-400" />}
                    </div>
                    <div className="mb-2 font-mono text-xs text-gray-400">
                      Args: {JSON.stringify(action.args).slice(0, 100)}
                    </div>
                    {action.result && (
                      <div className="font-mono text-xs text-gray-500">
                        Result: {JSON.stringify(action.result).slice(0, 200)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-1"
            >
              {logs.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <ScrollText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logs yet</p>
                </div>
              ) : (
                <div className="max-h-[500px] space-y-1 overflow-y-auto font-mono text-xs text-gray-400">
                  {logs.map((log, idx) => (
                    <div key={idx} className="rounded px-2 py-1 hover:bg-gray-800/30">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {memory.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Brain size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No memory entries yet</p>
                </div>
              ) : (
                memory.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3"
                  >
                    <div className="font-mono text-xs text-gray-400">
                      {JSON.stringify(entry, null, 2)}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {consentLedger.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No consent entries yet</p>
                </div>
              ) : (
                consentLedger.map(entry => (
                  <div
                    key={entry.id}
                    className={`rounded-lg border p-3 ${
                      entry.approved
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {entry.approved ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className="text-sm font-medium text-gray-200">{entry.action.type}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          entry.action.risk === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : entry.action.risk === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {entry.action.risk}
                      </span>
                    </div>
                    <div className="mb-1 text-xs text-gray-400">{entry.action.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()} • {entry.origin}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
