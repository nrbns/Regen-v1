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
import { AgentPlanner } from '../AgentPlanner';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { ExtensionNexusPanel } from '../plugins';
import { EcoImpactSimulator } from '../eco';
import { TrustWeaverPanel } from '../trust';
import { PrivacyDashboard } from '../privacy/PrivacyDashboard';
import type { ConsentRecord, ConsentActionType } from '../../types/consent';
import { formatDistanceToNow } from 'date-fns';
import { IdentityVaultPanel } from '../identity';
import { AIDockPanel } from '../ai/AIDockPanel';
import { EnhancedAIPanel } from '../ai/EnhancedAIPanel';

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
          className="w-96 flex flex-col bg-gray-900/95 backdrop-blur-xl border-l border-gray-800/50 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Brain size={20} className="text-blue-400" />
              Agent Console
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Enhanced AI Panel */}
          {activeTab === 'planner' && (
            <div className="border-b border-gray-800/50">
              <EnhancedAIPanel />
            </div>
          )}

          {/* Legacy AI Dock (fallback) */}
          {activeTab !== 'planner' && (
            <div className="border-b border-gray-800/50 p-4">
              <AIDockPanel />
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800/50 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                    transition-colors relative min-w-[80px]
                    ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}
                  `}
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
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                      <div className="text-xs text-gray-400 mb-2">Task: {plan.taskId}</div>
                      <div className="space-y-2">
                        {plan.steps.map((step, idx) => (
                          <div key={step.id} className="flex items-start gap-2 text-sm">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs text-blue-400 font-medium">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-200">{step.description}</div>
                              {step.tool && (
                                <div className="text-xs text-gray-500 mt-0.5">
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
                  <div className="text-xs text-gray-500 text-center py-8">
                    No active plan. Create a task to see the agent's reasoning.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-3">Tool Calls & Actions</div>
                {steps.length > 0 ? (
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gray-800/40 rounded p-3 border border-gray-700/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-300">{step.type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                          {step.content}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-8">No actions yet</div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-1 font-mono text-xs">
                <div className="text-sm text-gray-400 mb-2">Live Log Stream</div>
                <div className="bg-gray-950 rounded p-3 max-h-96 overflow-y-auto">
                  {logs.length > 0 ? (
                    <>
                      {logs.map((log, idx) => (
                        <div key={idx} className="text-gray-400 py-0.5">
                          {log}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </>
                  ) : (
                    <div className="text-gray-600 text-center py-8">No logs yet</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-3">Session Notes & Data</div>
                <div className="text-xs text-gray-500 text-center py-8">No session data</div>
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
                          className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="text-gray-300 font-medium">
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
                  <div className="text-xs text-gray-500 text-center py-8">
                    No consent records yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && <PrivacyDashboard />}

            {activeTab === 'trust' && <TrustWeaverPanel />}

            {activeTab === 'eco' && <EcoImpactSimulator />}

            {activeTab === 'identity' && <IdentityVaultPanel />}

            {activeTab === 'nexus' && <ExtensionNexusPanel />}
          </div>

          {/* Footer: Controls */}
          <div className="p-4 border-t border-gray-800/50 space-y-2">
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
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  {plan.remaining.tokens} tokens
                </span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  {plan.remaining.seconds}s
                </span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
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
