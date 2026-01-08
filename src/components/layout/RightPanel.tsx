/**
 * RightPanel - Enhanced Agent Console with live streams
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  Zap,
  FileText,
  Shield,
  ListChecks,
  Activity,
  Sparkles,
  Share2,
  Leaf,
  ShieldCheck,
  KeyRound,
  Lock,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AgentPlan, AgentStep, ConsentRequest } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { AgentPlanner } from '../agent/AgentPlanner';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { PrivacyDashboard } from '../integrations/PrivacyDashboard';
import type { ConsentRecord, ConsentActionType } from '../../types/consent';
import { formatDistanceToNow } from 'date-fns';
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags';
import { lazy, Suspense } from 'react';

const LazyEnhancedAIPanel = !isV1ModeEnabled()
  ? lazy(() => import('../ai/EnhancedAIPanel').then(m => ({ default: m.EnhancedAIPanel })))
  : null;

const LazyAIDockPanel = !isV1ModeEnabled()
  ? lazy(() => import('../ai/AIDockPanel').then(m => ({ default: m.AIDockPanel })))
  : null;

const ACTION_LABELS: Record<ConsentActionType, string> = {
  download: 'Download file',
  form_submit: 'Submit form',
  login: 'Login',
  scrape: 'Scrape content',
  export_data: 'Export data',
  access_clipboard: 'Clipboard access',
  access_camera: 'Camera access',
  access_microphone: 'Microphone access',
  access_filesystem: 'Filesystem access',
  ai_cloud: 'Cloud AI usage',
};

const statusLabel = (record: ConsentRecord): { label: string; tone: string } => {
  if (record.revokedAt) {
    return { label: 'Revoked', tone: 'text-red-400 bg-red-500/10 border-red-500/40' };
  }
  if (record.approved) {
    return { label: 'Approved', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40' };
  }
  return { label: 'Pending', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/40' };
};

interface RightPanelProps {
  open: boolean;
  onClose: () => void;
}

const tabs = [
  { id: 'planner', icon: Sparkles, label: 'Planner' },
  { id: 'plan', icon: ListChecks, label: 'Plan' },
  { id: 'actions', icon: Zap, label: 'Actions' },
  { id: 'privacy', icon: Lock, label: 'Privacy' },
  { id: 'logs', icon: Activity, label: 'Logs' },
  { id: 'memory', icon: FileText, label: 'Memory' },
  { id: 'consent', icon: Shield, label: 'Consent' },
  { id: 'trust', icon: ShieldCheck, label: 'Trust' },
  { id: 'eco', icon: Leaf, label: 'Eco' },
  { id: 'identity', icon: KeyRound, label: 'Identity' },
  { id: 'nexus', icon: Share2, label: 'Nexus' },
];

export function RightPanel({ open, onClose }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('planner');
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [dryRun, setDryRun] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const consentRefresh = useConsentOverlayStore(state => state.refresh);
  const consentList = useConsentOverlayStore(state => state.records);
  const openConsentDashboard = useConsentOverlayStore(state => state.open);

  // Listen for agent plan
  useIPCEvent<AgentPlan>(
    'agent:plan',
    data => {
      setPlan(data);
    },
    []
  );

  // Listen for agent steps
  useIPCEvent<AgentStep>(
    'agent:step',
    data => {
      setSteps(prev => [...prev, data]);
    },
    []
  );

  // Listen for agent logs
  useIPCEvent<AgentStep>(
    'agent:log',
    data => {
      setLogs(prev => [
        ...prev,
        `${new Date(data.timestamp).toLocaleTimeString()}: ${data.content}`,
      ]);
    },
    []
  );

  // Listen for consent requests
  useIPCEvent<ConsentRequest>(
    'agent:consent:request',
    () => {
      void consentRefresh();
    },
    [consentRefresh]
  );

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  useEffect(() => {
    setConsentRecords(consentList);
  }, [consentList]);

  useEffect(() => {
    if (open && activeTab === 'consent') {
      void consentRefresh();
    }
  }, [open, activeTab, consentRefresh]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex w-96 flex-col border-l border-gray-800/50 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800/50 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
              <Brain size={20} className="text-blue-400" />
              Agent Console
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Enhanced AI Panel (hidden in v1-mode) */}
          {!isV1ModeEnabled() && activeTab === 'planner' && LazyEnhancedAIPanel && (
            <div className="border-b border-gray-800/50">
              <Suspense fallback={null}>
                <LazyEnhancedAIPanel />
              </Suspense>
            </div>
          )}

          {/* Legacy AI Dock (fallback) - hidden in v1-mode */}
          {!isV1ModeEnabled() && activeTab !== 'planner' && LazyAIDockPanel && (
            <div className="border-b border-gray-800/50 p-4">
              <Suspense fallback={null}>
                <LazyAIDockPanel />
              </Suspense>
            </div>
          )}

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-800/50">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex min-w-[80px] flex-shrink-0 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'} `}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      layoutId="activeTab"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'planner' && <AgentPlanner />}

            {activeTab === 'plan' && (
              <div className="space-y-4">
                {plan ? (
                  <>
                    <div className="rounded-lg border border-gray-700/30 bg-gray-800/40 p-4">
                      <div className="mb-2 text-xs text-gray-400">Task: {plan.taskId}</div>
                      <div className="space-y-2">
                        {plan.steps.map((step, idx) => (
                          <div key={step.id} className="flex items-start gap-2 text-sm">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-medium text-blue-400">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-200">{step.description}</div>
                              {step.tool && (
                                <div className="mt-0.5 text-xs text-gray-500">
                                  Tool: {step.tool}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400">
                          Tokens: <span className="text-gray-200">{plan.remaining.tokens}</span>/
                          {plan.budget.tokens}
                        </span>
                        <span className="text-gray-400">
                          Time: <span className="text-gray-200">{plan.remaining.seconds}s</span>/
                          {plan.budget.seconds}s
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No active plan. Create a task to see the agent's reasoning.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-2">
                <div className="mb-3 text-sm text-gray-400">Tool Calls & Actions</div>
                {steps.length > 0 ? (
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded border border-gray-700/30 bg-gray-800/40 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300">{step.type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-xs text-gray-400">
                          {step.content}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">No actions yet</div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-1 font-mono text-xs">
                <div className="mb-2 text-sm text-gray-400">Live Log Stream</div>
                <div className="max-h-96 overflow-y-auto rounded bg-gray-950 p-3">
                  {logs.length > 0 ? (
                    <>
                      {logs.map((log, idx) => (
                        <div key={idx} className="py-0.5 text-gray-400">
                          {log}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </>
                  ) : (
                    <div className="py-8 text-center text-gray-600">No logs yet</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-2">
                <div className="mb-3 text-sm text-gray-400">Session Notes & Data</div>
                <div className="py-8 text-center text-xs text-gray-500">No session data</div>
              </div>
            )}

            {activeTab === 'consent' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Consent Ledger</span>
                  <button
                    onClick={() => void openConsentDashboard()}
                    className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] text-gray-300 hover:bg-slate-900/90"
                  >
                    Open dashboard
                  </button>
                </div>
                {consentRecords.length > 0 ? (
                  <div className="space-y-2">
                    {consentRecords.slice(0, 6).map(record => {
                      const status = statusLabel(record);
                      return (
                        <div
                          key={record.id}
                          className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-3"
                        >
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="font-medium text-gray-300">
                              {ACTION_LABELS[record.action.type]}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 ${status.tone}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {record.action.description}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-600">
                            <span>
                              {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                            </span>
                            {record.action.target && <span>• {record.action.target}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No consent records yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && <PrivacyDashboard />}

            {activeTab === 'trust' && (
              <div className="py-8 text-center text-xs text-gray-500">
                Trust panel is not available in this build
              </div>
            )}

            {activeTab === 'eco' && (
              <div className="py-8 text-center text-xs text-gray-500">
                Eco impact panel is not available in this build
              </div>
            )}

            {activeTab === 'identity' && (
              <div className="py-8 text-center text-xs text-gray-500">
                Identity vault panel is not available in this build
              </div>
            )}

            {activeTab === 'nexus' && (
              <div className="py-8 text-center text-xs text-gray-500">
                Extension nexus panel is not available in this build
              </div>
            )}
          </div>

          {/* Footer: Controls */}
          <div className="space-y-2 border-t border-gray-800/50 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                id="dry-run"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="dry-run" className="cursor-pointer">
                Dry-Run Mode
              </label>
            </div>
            {plan && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-400">
                  {plan.remaining.tokens} tokens
                </span>
                <span className="rounded bg-green-500/20 px-2 py-1 text-green-400">
                  {plan.remaining.seconds}s
                </span>
                <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-400">
                  {plan.remaining.requests} requests
                </span>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
