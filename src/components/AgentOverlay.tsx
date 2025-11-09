/**
 * AgentOverlay - Enhanced floating right panel with full tabs
 * Tabs: Plan, Actions, Logs, Memory, Ledger
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Square, Clock, Zap, FileText, Shield, Eye, Brain, ScrollText, CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { useIPCEvent } from '../lib/use-ipc-event';
import { ipc } from '../lib/ipc-typed';

type TabType = 'plan' | 'actions' | 'logs' | 'memory' | 'ledger';

interface AgentStep {
  id: string;
  tool: string;
  args: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: number;
}

const SparkleTrail = () => (
  <span className="flex items-center gap-1 text-purple-300/80">
    <Sparkles size={14} />
  </span>
);

const LoaderDots = () => (
  <span className="flex items-center gap-1">
    {[0, 0.2, 0.4].map((delay) => (
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
  const [activeTab, setActiveTab] = useState<TabType>('plan');
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
  const [taskId, setTaskId] = useState<string | null>(null);

  // Listen for agent events
  useIPCEvent<AgentPlan>('agent:plan', (data) => {
    setIsActive(true);
    setPlan(data);
    setTaskId(data.taskId);
    setStartTime(Date.now());
    setTokens(0);
    setRequests(0);
    setLogs([]);
    setActions([]);
    setConsentLedger([]);
    setMemory([]);
  }, []);

  useIPCEvent('agent:step', (data: any) => {
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
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.log}`]);
    }
    if (data.tokens) {
      setTokens(prev => prev + data.tokens);
    }
    setRequests(prev => prev + 1);
  }, []);

  useIPCEvent('agent:log', (data: any) => {
    if (data.message) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
    }
  }, []);

  useIPCEvent('agent:consent:request', (data: any) => {
    if (data.entry) {
      setConsentLedger(prev => [...prev, data.entry]);
    }
  }, []);

  useIPCEvent('agent:memory', (data: any) => {
    if (data.memory) {
      setMemory(prev => [...prev, data.memory]);
    }
  }, []);

  useIPCEvent('agent:complete', () => {
    setIsActive(false);
    setCurrentStep(null);
  }, []);

  useEffect(() => {
    // Load consent ledger from consent API
    const loadLedger = async () => {
      try {
        const ledger = await ipc.consent.list() as any;
        if (Array.isArray(ledger)) {
          setConsentLedger(ledger.map((entry: any) => ({
            id: entry.id?.toString() || crypto.randomUUID(),
            timestamp: entry.timestamp || Date.now(),
            action: {
              type: entry.action?.type || 'unknown',
              description: entry.action?.description || 'Unknown action',
              risk: entry.action?.risk || 'medium',
            },
            approved: entry.approved !== false,
            origin: entry.origin || 'agent',
          })));
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
      className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-400" size={20} />
            <h3 className="font-semibold text-gray-200">Agent Console</h3>
          </div>
          <button
            onClick={() => setIsActive(false)}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            <Square size={16} />
          </button>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <Zap size={12} />
              <span>Tokens</span>
            </div>
            <div className="text-gray-200 font-mono">{tokens.toLocaleString()}</div>
            {plan?.remaining && (
              <div className="text-gray-500 text-xs">/ {plan.remaining.tokens}</div>
            )}
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <Clock size={12} />
              <span>Time</span>
            </div>
            <div className="text-gray-200 font-mono">{elapsedTime}s</div>
            {plan?.budget && (
              <div className="text-gray-500 text-xs">/ {plan.budget.seconds}s</div>
            )}
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <FileText size={12} />
              <span>Requests</span>
            </div>
            <div className="text-gray-200 font-mono">{requests}</div>
            {plan?.remaining && (
              <div className="text-gray-500 text-xs">/ {plan.remaining.requests}</div>
            )}
          </div>
        </div>

        {/* Dry-run Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="dryrun"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="dryrun" className="text-xs text-gray-400">
            Dry-run mode
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
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
          {activeTab === 'plan' && plan && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Goal</h4>
                <p className="text-sm text-gray-400">{plan.goal}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Budget</h4>
                <div className="bg-gray-800/50 rounded p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens:</span>
                    <span className="text-gray-200">{plan.remaining.tokens} / {plan.budget.tokens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time:</span>
                    <span className="text-gray-200">{plan.remaining.seconds}s / {plan.budget.seconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requests:</span>
                    <span className="text-gray-200">{plan.remaining.requests} / {plan.budget.requests}</span>
                  </div>
                </div>
              </div>

              {plan.steps.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <SparkleTrail />
                    Redix thinking
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {plan.steps.map((step, idx) => {
                      const action = actions.find((a) => a.id === step.id);
                      let status: 'pending' | 'running' | 'completed' | 'error' = 'pending';
                      if (action?.status === 'completed') status = 'completed';
                      else if (action?.status === 'error') status = 'error';
                      else if (action?.status === 'running' || currentStep === step.id) status = 'running';

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
                            <span className="relative z-10 text-xs font-semibold text-white/90">{idx + 1}</span>
                          </div>
                          <span className="w-20 text-center text-[10px] text-gray-400 line-clamp-2">
                            {step.tool || step.description}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Steps ({plan.steps.length})</h4>
                <div className="space-y-2">
                  {plan.steps.map((step, idx) => {
                    const isCurrent = step.id === currentStep;
                    const action = actions.find(a => a.id === step.id);
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border ${
                          isCurrent
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : action?.status === 'completed'
                            ? 'border-green-500/30 bg-green-500/5'
                            : action?.status === 'error'
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-gray-700/50 bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-200">{step.tool || step.description}</span>
                          {isCurrent && (
                            <motion.div
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="w-2 h-2 bg-blue-400 rounded-full"
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
                          <div className="text-xs text-gray-400 mt-1">{step.description}</div>
                        )}
                        {action?.result && (
                          <div className="text-xs text-gray-500 font-mono mt-2 truncate">
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
                  {plan?.steps.slice(0, 3).map((step, index) => (
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
                actions.map((action) => (
                  <div
                    key={action.id}
                    className={`p-3 rounded-lg border ${
                      action.status === 'completed'
                        ? 'border-green-500/30 bg-green-500/5'
                        : action.status === 'error'
                        ? 'border-red-500/30 bg-red-500/5'
                        : action.status === 'running'
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-gray-700/50 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-200">{action.tool}</span>
                      {action.status === 'completed' && <CheckCircle2 size={14} className="text-green-400" />}
                      {action.status === 'error' && <XCircle size={14} className="text-red-400" />}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mb-2">
                      Args: {JSON.stringify(action.args).slice(0, 100)}
                    </div>
                    {action.result && (
                      <div className="text-xs text-gray-500 font-mono">
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
                <div className="text-center text-gray-500 py-8">
                  <ScrollText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logs yet</p>
                </div>
              ) : (
                <div className="font-mono text-xs text-gray-400 space-y-1 max-h-[500px] overflow-y-auto">
                  {logs.map((log, idx) => (
                    <div key={idx} className="hover:bg-gray-800/30 rounded px-2 py-1">
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
                <div className="text-center text-gray-500 py-8">
                  <Brain size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No memory entries yet</p>
                </div>
              ) : (
                memory.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30">
                    <div className="text-xs text-gray-400 font-mono">
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
                <div className="text-center text-gray-500 py-8">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No consent entries yet</p>
                </div>
              ) : (
                consentLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border ${
                      entry.approved
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {entry.approved ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className="text-sm font-medium text-gray-200">{entry.action.type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        entry.action.risk === 'high'
                          ? 'bg-red-500/20 text-red-400'
                          : entry.action.risk === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {entry.action.risk}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{entry.action.description}</div>
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
