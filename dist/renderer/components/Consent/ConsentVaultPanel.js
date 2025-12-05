import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Download } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
export function ConsentVaultPanel() {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchSnapshot = async () => {
        try {
            setLoading(true);
            const response = await ipc.consent.vault.export();
            setSnapshot(response);
            setLoading(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
        }
    };
    useEffect(() => {
        void fetchSnapshot();
    }, []);
    const handleExport = () => {
        if (!snapshot)
            return;
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `consent-vault-${snapshot.updatedAt}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: "rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-100 shadow-[0_20px_60px_rgba(16,185,129,0.25)]", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-emerald-200", children: [_jsx(ShieldCheck, { size: 16 }), " Quantum Consent Vault"] }), _jsx("div", { className: "text-xs text-emerald-100/70", children: "Each consent is sealed with a hash-chain signature. Export receipts for audits." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => void fetchSnapshot(), className: "rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20", disabled: loading, children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(RefreshCw, { size: 12, className: loading ? 'animate-spin' : '' }), "Refresh"] }) }), _jsx("button", { type: "button", onClick: handleExport, disabled: !snapshot, className: "rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Download, { size: 12 }), " Export"] }) })] })] }), error && (_jsx("div", { className: "mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100", children: error })), !error && (_jsxs("div", { className: "mt-4 max-h-64 overflow-y-auto rounded-2xl border border-emerald-500/15 bg-emerald-900/30", children: [!snapshot && loading && (_jsx("div", { className: "p-6 text-center text-xs text-emerald-100/70", children: "Loading quantum receipts\u2026" })), snapshot && !loading && (_jsxs("div", { className: "divide-y divide-emerald-500/10 text-[11px]", children: [snapshot.entries.map((entry) => {
                                const metadata = typeof entry.metadata === 'object' && entry.metadata !== null ? entry.metadata : undefined;
                                const risk = typeof metadata?.risk === 'string' ? metadata.risk : undefined;
                                const target = typeof metadata?.target === 'string' ? metadata.target : undefined;
                                return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 }, className: "space-y-1 px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between text-emerald-100", children: [_jsx("span", { className: "font-medium uppercase tracking-wide text-[10px]", children: entry.actionType }), _jsx("span", { className: "text-emerald-200/70", children: new Date(entry.timestamp).toLocaleString() })] }), _jsxs("div", { className: "text-emerald-100/90 break-all", children: ["Chain hash: ", entry.chainHash] }), _jsxs("div", { className: "text-emerald-100/70 break-all", children: ["Signature: ", entry.signature] }), risk && _jsxs("div", { className: "text-emerald-100/70", children: ["Risk: ", risk] }), target && _jsxs("div", { className: "text-emerald-100/70 break-all", children: ["Target: ", target] })] }, entry.chainHash));
                            }), snapshot.entries.length === 0 && (_jsx("div", { className: "p-6 text-center text-xs text-emerald-200/70", children: "Ledger empty. Approve a consent request to generate the first block." }))] }))] })), snapshot && (_jsxs("div", { className: "mt-3 text-[10px] text-emerald-200/60", children: ["Anchor hash: ", snapshot.anchor] }))] }));
}
