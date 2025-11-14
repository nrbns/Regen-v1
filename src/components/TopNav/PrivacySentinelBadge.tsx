import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import type { PrivacyAuditSummary } from '../../lib/ipc-events';

const POLL_INTERVAL = 15000;

function gradeToColor(grade: PrivacyAuditSummary['grade']): string {
  switch (grade) {
    case 'high':
      return 'bg-red-500/90 text-white border-red-400/50';
    case 'moderate':
      return 'bg-amber-500/90 text-white border-amber-400/50';
    default:
      return 'bg-emerald-500/90 text-white border-emerald-400/50';
  }
}

function gradeToIcon(grade: PrivacyAuditSummary['grade']) {
  switch (grade) {
    case 'high':
      return AlertTriangle;
    case 'moderate':
      return Shield;
    default:
      return CheckCircle2;
  }
}

export function PrivacySentinelBadge() {
  const activeTabId = useTabsStore((state) => state.activeId);
  const [audit, setAudit] = useState<PrivacyAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const runAudit = useCallback(async () => {
    if (!activeTabId) {
      setAudit(null);
      return;
    }
    setLoading(true);
    try {
      const result = await ipc.privacy.sentinel.audit(activeTabId);
      setAudit(result ?? null);
    } catch (error) {
      console.warn('[PrivacySentinel] audit failed', error);
    } finally {
      setLoading(false);
    }
  }, [activeTabId]);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  useEffect(() => {
    if (!activeTabId) return;
    const timer = window.setInterval(runAudit, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [activeTabId, runAudit]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const blockedCount = useMemo(() => {
    if (!audit) return 0;
    return audit.trackers.reduce((sum, t) => sum + t.count, 0);
  }, [audit]);

  const thirdPartyCount = useMemo(() => {
    if (!audit) return 0;
    return audit.thirdPartyHosts.length;
  }, [audit]);

  const Icon = audit ? gradeToIcon(audit.grade) : Shield;
  const gradeClass = audit ? gradeToColor(audit.grade) : 'bg-slate-500/70 text-white border-slate-400/50';

  return (
    <div ref={badgeRef} className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`no-drag flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${gradeClass} shadow-sm hover:shadow-md`}
        onClick={() => setPanelOpen(!panelOpen)}
        title={audit ? `${blockedCount} trackers blocked • ${audit.message}` : 'Privacy Sentinel'}
      >
        <Icon size={14} />
        {loading ? (
          <span>Scanning…</span>
        ) : audit ? (
          <>
            <span className="font-semibold">{blockedCount}</span>
            <span className="hidden lg:inline">blocked</span>
          </>
        ) : (
          <span>—</span>
        )}
      </motion.button>

      <AnimatePresence>
        {panelOpen && audit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setPanelOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-surface-elevated/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={audit.grade === 'high' ? 'text-red-400' : audit.grade === 'moderate' ? 'text-amber-400' : 'text-emerald-400'} />
                    <h3 className="font-semibold text-sm">Privacy Sentinel</h3>
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Close panel"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Privacy Score</span>
                    <span className={`text-sm font-semibold ${audit.grade === 'high' ? 'text-red-400' : audit.grade === 'moderate' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {audit.score}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Trackers Blocked</span>
                    <span className="text-sm font-semibold text-primary">{blockedCount}</span>
                  </div>
                  {thirdPartyCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">3rd-Party Hosts</span>
                      <span className="text-sm font-semibold text-muted">{thirdPartyCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {audit.trackers.length > 0 && (
                <div className="p-4 border-b border-white/5 max-h-48 overflow-y-auto">
                  <h4 className="text-xs font-semibold mb-2 text-muted uppercase tracking-wide">Blocked Trackers</h4>
                  <div className="space-y-1">
                    {audit.trackers.slice(0, 10).map((tracker, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted truncate flex-1">{tracker.host}</span>
                        <span className="text-muted/70 ml-2">{tracker.count}</span>
                      </div>
                    ))}
                    {audit.trackers.length > 10 && (
                      <div className="text-xs text-muted/70 pt-1">
                        +{audit.trackers.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {audit.suggestions.length > 0 && (
                <div className="p-4">
                  <h4 className="text-xs font-semibold mb-2 text-muted uppercase tracking-wide">Suggestions</h4>
                  <ul className="space-y-1.5">
                    {audit.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-muted/80 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {audit.ai && (
                <div className="p-4 border-t border-white/5 bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">AI Analysis</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      audit.ai.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                      audit.ai.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {audit.ai.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-muted/80 mb-2">{audit.ai.summary}</p>
                  {audit.ai.issues.length > 0 && (
                    <div className="space-y-1">
                      {audit.ai.issues.slice(0, 3).map((issue, idx) => (
                        <div key={idx} className="text-xs text-muted/70">
                          <span className="font-medium">{issue.category}:</span> {issue.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 border-t border-white/5 bg-white/5">
                <button
                  onClick={runAudit}
                  disabled={loading}
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                >
                  {loading ? 'Scanning…' : 'Refresh Scan'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
