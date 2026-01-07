/**
 * Agent Audit Detail Modal
 * Expanded view of agent run safety logs with filtering and search
 */

import { motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SafetyAuditEntry } from '../../core/agent/safety';

interface AgentAuditModalProps {
  runId: string;
  entries: SafetyAuditEntry[];
  visible: boolean;
  onClose: () => void;
}

export function AgentAuditModal({ runId, entries, visible, onClose }: AgentAuditModalProps) {
  if (!visible) return null;

  const allowed = entries.filter(e => e.allowed);
  const blocked = entries.filter(e => !e.allowed);
  const consent = entries.filter(e => e.consentRequired);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[85vh] w-[min(900px,95vw)] flex-col rounded-2xl border border-slate-700/70 bg-slate-950/95 text-gray-100"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-300/80">Agent Run</div>
            <h2 className="mt-1 font-semibold text-white">{runId}</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90"
            aria-label="Close audit modal"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Allowed"
                value={allowed.length}
                color="emerald"
                icon={CheckCircle2}
              />
              <SummaryCard label="Blocked" value={blocked.length} color="red" icon={Lock} />
              <SummaryCard
                label="Consent Required"
                value={consent.length}
                color="amber"
                icon={AlertTriangle}
              />
            </div>

            {/* Blocked entries */}
            {blocked.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-300">
                  Blocked Actions ({blocked.length})
                </h3>
                <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  {blocked.map((entry, idx) => (
                    <AuditEntryCard key={`${runId}-blocked-${idx}`} entry={entry} tone="red" />
                  ))}
                </div>
              </section>
            )}

            {/* Allowed entries */}
            {allowed.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Allowed Actions ({allowed.length})
                </h3>
                <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  {allowed.map((entry, idx) => (
                    <AuditEntryCard
                      key={`${runId}-allowed-${idx}`}
                      entry={entry}
                      tone="emerald"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Consent entries */}
            {consent.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-300">
                  Consent Requests ({consent.length})
                </h3>
                <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  {consent.map((entry, idx) => (
                    <AuditEntryCard
                      key={`${runId}-consent-${idx}`}
                      entry={entry}
                      tone="amber"
                    />
                  ))}
                </div>
              </section>
            )}

            {entries.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Lock size={20} className="text-slate-600" />
                <span>No audit entries for this run</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'amber';
  icon: typeof Lock;
}) {
  const colorMap = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    red: 'border-red-500/30 bg-red-500/10 text-red-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };

  return (
    <div className={`rounded-xl border ${colorMap[color]} p-4`}>
      <div className="flex items-center gap-2">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function AuditEntryCard({
  entry,
  tone,
}: {
  entry: SafetyAuditEntry;
  tone: 'emerald' | 'red' | 'amber';
}) {
  const toneMap = {
    emerald: 'border-emerald-400/30 bg-emerald-950/40 text-emerald-100',
    red: 'border-red-400/30 bg-red-950/40 text-red-100',
    amber: 'border-amber-400/30 bg-amber-950/40 text-amber-100',
  };

  return (
    <div className={`rounded-lg border p-3 text-xs ${toneMap[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{entry.tool}</div>
          <div className="mt-1 text-[11px] opacity-80">
            <div>Risk: {entry.risk.toUpperCase()}</div>
            {entry.reason && <div className="mt-1 text-[10px]">{entry.reason}</div>}
            {entry.inputPreview && (
              <div className="mt-1 truncate text-[10px] opacity-70" title={entry.inputPreview}>
                {entry.inputPreview}
              </div>
            )}
            <div className="mt-1 text-[10px] opacity-60">
              {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
            </div>
          </div>
        </div>
        <span className="whitespace-nowrap font-mono text-[10px]">
          {entry.consentRequired ? (
            <>
              {entry.consentGranted ? '✓ consent' : '✗ denied'}
            </>
          ) : (
            'no consent'
          )}
        </span>
      </div>
    </div>
  );
}
