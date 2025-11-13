import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Filter, Download, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { ipc } from '../../lib/ipc-typed';
import type { ConsentRecord, ConsentActionType, ConsentRisk } from '../../types/consent';
import { formatDistanceToNow } from 'date-fns';
import { ConsentVaultPanel } from './ConsentVaultPanel';
import { CONSENT_ACTION_LABELS, CONSENT_ACTION_OPTIONS, CONSENT_STATUS_OPTIONS } from './consentLabels';
import { ConsentFlowGraph } from './ConsentFlowGraph';

const statusLabel = (record: ConsentRecord): { label: string; tone: string } => {
  if (record.revokedAt) {
    return { label: 'Revoked', tone: 'text-red-400 bg-red-500/10 border-red-500/40' };
  }
  if (record.approved) {
    return { label: 'Approved', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40' };
  }
  return { label: 'Pending', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/40' };
};

const riskIcon = (risk: ConsentRisk) => {
  if (risk === 'high') return <AlertTriangle size={14} className="text-red-400" />;
  if (risk === 'medium') return <ShieldAlert size={14} className="text-amber-400" />;
  return <ShieldCheck size={14} className="text-emerald-400" />;
};

export function ConsentDashboard() {
  const { visible, records, loading, error, filter, close, refresh, setFilter, approve, revoke } = useConsentOverlayStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      void refresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [visible, refresh]);

  const pendingCount = useMemo(() => records.filter((record) => !record.approved).length, [records]);
  const revokedCount = useMemo(() => records.filter((record) => Boolean(record.revokedAt)).length, [records]);
  const approvedCount = useMemo(() => records.filter((record) => record.approved && !record.revokedAt).length, [records]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const json = await ipc.consent.export();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `omnibrowser-consent-ledger-${new Date().toISOString()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export consent ledger', err);
    } finally {
      setExporting(false);
    }
  };

  const renderRecord = (record: ConsentRecord) => {
    const status = statusLabel(record);
    const distance = formatDistanceToNow(new Date(record.timestamp), { addSuffix: true });
    return (
      <div key={record.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-200">
            {riskIcon(record.action.risk)}
            <span>{CONSENT_ACTION_LABELS[record.action.type]}</span>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${status.tone}`}>{status.label}</span>
        </div>
        <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{record.action.description}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-gray-500">
          <div>
            <span className="text-gray-400">Target:</span>{' '}
            <span className="text-gray-200">{record.action.target ?? '—'}</span>
          </div>
          <div>
            <span className="text-gray-400">Risk:</span>{' '}
            <span className="text-gray-200 capitalize">{record.action.risk}</span>
          </div>
          <div>
            <span className="text-gray-400">Requested:</span>{' '}
            <span className="text-gray-200">{distance}</span>
          </div>
          <div>
            <span className="text-gray-400">Ledger ID:</span>{' '}
            <span className="text-gray-500 font-mono text-[10px]">{record.id.slice(0, 8)}…</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Signature:</span>
          <span className="font-mono truncate text-gray-600">{record.signature.slice(0, 24)}…</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            User: <span className="text-gray-300">{record.userId}</span>
          </div>
          <div className="flex items-center gap-2">
            {!record.approved && !record.revokedAt && (
              <>
                <button
                  onClick={() => approve(record.id)}
                  className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                >
                  Approve
                </button>
                <button
                  onClick={() => revoke(record.id)}
                  className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                >
                  Reject
                </button>
              </>
            )}
            {record.approved && !record.revokedAt && (
              <button
                onClick={() => revoke(record.id)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-[min(900px,92vw)] max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/95 text-gray-100 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-800/60 px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-300/80">
              <ShieldAlert size={14} /> Consent Playground
            </div>
            <div className="text-lg font-semibold text-white">Review & control ethical AI memory</div>
            <div className="text-[11px] text-gray-500">Pending {pendingCount} · Approved {approvedCount} · Revoked {revokedCount}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-gray-200 hover:bg-slate-900/90 disabled:opacity-50"
            >
              <Download size={14} className={exporting ? 'animate-pulse' : ''} /> Export Ledger
            </button>
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-2 text-gray-300 hover:bg-slate-900/90 disabled:opacity-50"
              aria-label="Refresh consent ledger"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => close()}
              className="rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-gray-300 hover:bg-slate-900/90"
              aria-label="Close consent dashboard"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 overflow-y-auto max-h-[75vh]">
          <ConsentFlowGraph records={records} onApprove={approve} onRevoke={revoke} loading={loading} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),auto]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <Filter size={14} />
              <select
                value={filter.type ?? 'all'}
                onChange={(event) => void setFilter({ type: event.target.value as ConsentActionType | 'all' })}
                className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-gray-200"
              >
                {CONSENT_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.status ?? 'all'}
                onChange={(event) => void setFilter({ status: event.target.value as 'all' | 'pending' | 'approved' | 'revoked' })}
                className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-gray-200"
              >
                {CONSENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading consent ledger…
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-gray-500">
              <ShieldCheck size={32} className="text-emerald-400" />
              <div>No consent records yet. Run agent actions to populate the ledger.</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {records.map(renderRecord)}
            </div>
          )}
        </div>
      </motion.div>

      <ConsentVaultPanel />
    </div>
  );
}
