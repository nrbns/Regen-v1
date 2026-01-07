import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  AlertTriangle,
  Fingerprint,
  Radar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { AgentSystemDashboard } from '../agent/AgentSystemDashboard';
import { WorkflowAnalyticsDashboard } from '../agent/WorkflowAnalyticsDashboard';
import { WorkflowOptimizerPanel } from '../agent/WorkflowOptimizerPanel';

const ACTION_LABELS: Record<string, string> = {
  download: 'Download file',
  form_submit: 'Submit form',
  login: 'Login request',
  scrape: 'Scrape content',
  export_data: 'Export data',
  access_clipboard: 'Clipboard access',
  access_camera: 'Camera access',
  access_microphone: 'Microphone access',
  access_filesystem: 'Filesystem access',
  ai_cloud: 'Cloud AI call',
};

export function TrustEthicsDashboard() {
  const {
    visible,
    loading,
    error,
    consentTimeline,
    trustSignals,
    shieldsStatus,
    privacyAudit,
    consentStats,
    blockedSummary,
    agentAudits,
    lastUpdated,
    refresh,
    close,
  } = useTrustDashboardStore();
  const openConsent = useConsentOverlayStore((state) => state.open);
  const agentAuditItems = useMemo(() => agentAudits.slice(0, 5), [agentAudits]);
  useEffect(() => {
    if (!visible) return;
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [visible, refresh]);

  const timelineItems = useMemo(() => consentTimeline.slice(0, 8), [consentTimeline]);
  const highRiskSignals = useMemo(
    () => trustSignals.filter((record) => record.verdict !== 'trusted').slice(0, 6),
    [trustSignals],
  );
  const trustedSignals = useMemo(
    () => trustSignals.filter((record) => record.verdict === 'trusted').slice(0, 6),
    [trustSignals],
  );

  if (!visible) {
    return null;
  }

  const lastUpdatedLabel = lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : 'just now';

  const auditSeverityVariant =
    privacyAudit?.grade === 'high' ? 'danger' : privacyAudit?.grade === 'moderate' ? 'warning' : 'info';

  return (
    <div className="fixed inset-0 z-[1125] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative flex h-[90vh] w-[min(1100px,94vw)] flex-col overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/95 text-gray-100 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
      >
        <header className="flex items-start justify-between border-b border-slate-800/60 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              <Shield size={14} /> Trust &amp; Ethics
            </div>
            <h1 className="mt-1 text-lg font-semibold text-white">Real-time consent ledger &amp; threat summary</h1>
            <div className="mt-1 text-[11px] text-slate-500">
              {loading ? 'Refreshing…' : `Last updated ${lastUpdatedLabel}`}
              {error && <span className="ml-2 text-red-300">· {error}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-300' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void openConsent()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
            >
              <CheckCircle2 size={14} />
              Open consent ledger
            </button>
            <button
              type="button"
              onClick={() => close()}
              className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90"
              aria-label="Close trust dashboard"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryCard
                  title="Consent posture"
                  icon={ShieldCheck}
                  tone="emerald"
                  stats={[
                    { label: 'Pending', value: consentStats.pending },
                    { label: 'Approved', value: consentStats.approved },
                    { label: 'Revoked', value: consentStats.revoked },
                  ]}
                />
                <SummaryCard
                  title="Shields blocked"
                  icon={ShieldAlert}
                  tone="sky"
                  stats={[
                    { label: 'Trackers', value: blockedSummary.trackers },
                    { label: 'Ads', value: blockedSummary.ads },
                    { label: 'HTTPS upgrades', value: blockedSummary.upgrades },
                  ]}
                  footer={
                    shieldsStatus
                      ? `${shieldsStatus.cookies3p === 'block' ? '3p cookies blocked' : '3p cookies allowed'} · ${
                          shieldsStatus.webrtcBlocked ? 'WebRTC protected' : 'WebRTC open'
                        }`
                      : 'No shield data yet'
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70">
                <HeaderRow icon={Clock} title="Consent timeline" description="Live ledger of ethical approvals" />
                <div className="divide-y divide-slate-800/60">
                  {timelineItems.length === 0 ? (
                    <EmptyState message="No consent activity recorded yet." />
                  ) : (
                    timelineItems.map((record) => {
                      const status = record.revokedAt
                        ? { label: 'Revoked', tone: 'text-red-300 border-red-400/40 bg-red-500/10' }
                        : record.approved
                          ? { label: 'Approved', tone: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' }
                          : { label: 'Pending', tone: 'text-amber-300 border-amber-400/40 bg-amber-500/10' };
                      const riskIcon =
                        record.action.risk === 'high'
                          ? AlertTriangle
                          : record.action.risk === 'medium'
                            ? ShieldAlert
                            : CheckCircle2;
                      const RiskIcon = riskIcon;
                      return (
                        <div key={record.id} className="flex items-center gap-4 px-4 py-3 text-sm text-gray-200">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/80">
                            <RiskIcon size={16} className="text-emerald-300" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {ACTION_LABELS[record.action.type] ?? record.action.type}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">{record.action.description}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${status.tone}`}>{status.label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70">
                <HeaderRow icon={Radar} title="Privacy Sentinel" description="Latest AI risk sweep" />
                <div className="space-y-3 px-4 py-4">
                  {privacyAudit ? (
                    <>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          auditSeverityVariant === 'danger'
                            ? 'border-red-500/40 bg-red-500/10 text-red-200'
                            : auditSeverityVariant === 'warning'
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                        }`}
                      >
                        <Activity size={12} />
                        {privacyAudit.grade === 'high'
                          ? 'High risk detected'
                          : privacyAudit.grade === 'moderate'
                            ? 'Watch this tab'
                            : 'Clean'}
                      </div>

                      <p className="text-sm text-slate-300">{privacyAudit.message}</p>

                      {privacyAudit.trackers.length > 0 && (
                        <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trackers</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                            {privacyAudit.trackers.slice(0, 6).map((tracker) => (
                              <span
                                key={`${tracker.host}-${tracker.count}`}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-950/80 px-3 py-1"
                              >
                                <Fingerprint size={11} className="text-slate-400" />
                                {tracker.host}
                                <span className="text-[10px] text-slate-500">×{tracker.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {privacyAudit.suggestions.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-slate-800/60 bg-slate-900/70 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested fixes</div>
                          <ul className="space-y-1 text-xs text-slate-300">
                            {privacyAudit.suggestions.slice(0, 4).map((suggestion) => (
                              <li key={suggestion} className="flex items-start gap-2">
                                <ArrowUpRight size={11} className="mt-0.5 text-emerald-300" />
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState message="No privacy audit data yet. Trigger an audit from the Shield icon in the top bar." />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70">
                <HeaderRow icon={Shield} title="Agent safety log" description="Latest AI actions & outcomes" />
                <div className="divide-y divide-slate-800/60">
                  {agentAuditItems.length === 0 ? (
                    <EmptyState message="No agent actions recorded yet." />
                  ) : (
                    agentAuditItems.map((audit) => (
                      <div key={audit.runId} className="px-4 py-3 text-sm text-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">Run {audit.runId}</span>
                          <span className="text-[11px] text-slate-500">{audit.entries.length} steps</span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-300">
                          {audit.entries.slice(0, 3).map((entry, idx) => {
                            const tone = entry.allowed
                              ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                              : 'text-red-300 border-red-500/30 bg-red-500/10';
                            return (
                              <div
                                key={`${audit.runId}-${idx}`}
                                className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1"
                              >
                                <span className="truncate">
                                  {entry.tool} · {entry.risk}
                                  {entry.reason ? ` · ${entry.reason}` : ''}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${tone}`}>
                                  {entry.allowed ? 'allowed' : 'blocked'}
                                </span>
                              </div>
                            );
                          })}
                          {audit.entries.length > 3 && (
                            <div className="text-[11px] text-slate-500">+{audit.entries.length - 3} more…</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                <AgentSystemDashboard />
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                <WorkflowAnalyticsDashboard />
              </div>

              {/* Optimizer Quick Access */}
              <div className="rounded-2xl border border-blue-700/40 bg-blue-900/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white">Workflow Optimizer</div>
                  <div className="text-[11px] text-slate-400">Review and apply AI-powered suggestions</div>
                </div>
                <WorkflowOptimizerPanel />
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70">
                <HeaderRow icon={Ban} title="Trust alerts" description="Domains flagged by the mesh" />
                <div className="divide-y divide-slate-800/60">
                  {highRiskSignals.length === 0 ? (
                    <EmptyState message="No high-risk domains flagged." />
                  ) : (
                    highRiskSignals.map((record) => (
                      <div key={record.domain} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200">
                          <ShieldAlert size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.domain}</span>
                            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
                              {record.verdict.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Score {Math.round(record.score)} · {record.signals} signals ·{' '}
                            {formatDistanceToNow(record.lastUpdated, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70">
                <HeaderRow icon={ShieldCheck} title="Trusted mesh" description="Domains with positive consensus" />
                <div className="flex flex-col gap-3 px-4 py-4">
                  {trustedSignals.length === 0 ? (
                    <EmptyState message="No trusted domains recorded yet." />
                  ) : (
                    trustedSignals.map((record) => (
                      <div
                        key={`trusted-${record.domain}`}
                        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{record.domain}</span>
                          <span className="text-xs uppercase tracking-wide text-emerald-300/80">Score {Math.round(record.score)}</span>
                        </div>
                        <div className="mt-1 text-xs text-emerald-200/80">
                          Confidence {Math.round(record.confidence * 100)}% · {record.signals} peer signals
                        </div>
                        {record.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-200/80">
                            {record.tags.slice(0, 4).map((tag) => (
                              <span key={`${record.domain}-${tag}`} className="rounded-full border border-emerald-400/40 px-2 py-0.5">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  stats,
  footer,
  tone,
}: {
  title: string;
  icon: typeof Shield;
  stats: Array<{ label: string; value: number }>;
  footer?: string;
  tone: 'emerald' | 'sky';
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  const accent = tone === 'emerald' ? 'text-emerald-200' : 'text-sky-200';
  return (
    <div className={`rounded-2xl border ${toneClasses} px-4 py-4`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} className={accent} />
        {title}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-white">{stat.value}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-300">{stat.label}</div>
          </div>
        ))}
      </div>
      {footer && <div className="mt-3 text-[11px] text-slate-200/80">{footer}</div>}
    </div>
  );
}

function HeaderRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
        <Icon size={14} className="text-emerald-300" />
        {title}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{description}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-xs text-slate-500">
      <Shield size={18} className="text-slate-600" />
      <span>{message}</span>
    </div>
  );
}

