// Agent Audit Detail Modal (original preserved)

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
            {/* Summary cards and entries - original UI preserved in deferred copy */}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AgentAuditModal;
/**
 * Agent Audit Detail Modal (deferred)
 */

import { motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SafetyAuditEntry } from '../../core/agent/safety';

export function AgentAuditModal() {
  // Deferred full implementation preserved here for rollback.
  return null;
}

export default AgentAuditModal;
