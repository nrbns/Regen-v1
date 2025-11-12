import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Download } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

interface VaultEntry {
  consentId: string;
  actionType: string;
  approved: boolean;
  timestamp: number;
  signature: string;
  chainHash: string;
  metadata: Record<string, unknown>;
}

interface VaultSnapshot {
  entries: VaultEntry[];
  anchor: string;
  updatedAt: number;
}

export function ConsentVaultPanel() {
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = async () => {
    try {
      setLoading(true);
      const response = await ipc.consent.vault.export();
      setSnapshot(response as VaultSnapshot);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSnapshot();
  }, []);

  const handleExport = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `consent-vault-${snapshot.updatedAt}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-100 shadow-[0_20px_60px_rgba(16,185,129,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <ShieldCheck size={16} /> Quantum Consent Vault
          </div>
          <div className="text-xs text-emerald-100/70">Each consent is sealed with a hash-chain signature. Export receipts for audits.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchSnapshot()}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20"
            disabled={loading}
          >
            <div className="flex items-center gap-1">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </div>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!snapshot}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-1">
              <Download size={12} /> Export
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </div>
      )}

      {!error && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-emerald-500/15 bg-emerald-900/30">
          {!snapshot && loading && (
            <div className="p-6 text-center text-xs text-emerald-100/70">Loading quantum receipts…</div>
          )}
          {snapshot && !loading && (
            <div className="divide-y divide-emerald-500/10 text-[11px]">
              {snapshot.entries.map((entry) => {
                const metadata = typeof entry.metadata === 'object' && entry.metadata !== null ? (entry.metadata as Record<string, unknown>) : undefined;
                const risk = typeof metadata?.risk === 'string' ? metadata.risk : undefined;
                const target = typeof metadata?.target === 'string' ? metadata.target : undefined;
                return (
                  <motion.div
                    key={entry.chainHash}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-1 px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-emerald-100">
                      <span className="font-medium uppercase tracking-wide text-[10px]">{entry.actionType}</span>
                      <span className="text-emerald-200/70">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-emerald-100/90 break-all">Chain hash: {entry.chainHash}</div>
                    <div className="text-emerald-100/70 break-all">Signature: {entry.signature}</div>
                    {risk && <div className="text-emerald-100/70">Risk: {risk}</div>}
                    {target && <div className="text-emerald-100/70 break-all">Target: {target}</div>}
                  </motion.div>
                );
              })}
              {snapshot.entries.length === 0 && (
                <div className="p-6 text-center text-xs text-emerald-200/70">
                  Ledger empty. Approve a consent request to generate the first block.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {snapshot && (
        <div className="mt-3 text-[10px] text-emerald-200/60">
          Anchor hash: {snapshot.anchor}
        </div>
      )}
    </div>
  );
}
