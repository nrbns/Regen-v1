import { useCallback, useEffect, useMemo, useState } from 'react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import type { PrivacyAuditSummary } from '../../lib/ipc-events';

const POLL_INTERVAL = 15000;

function gradeToColor(grade: PrivacyAuditSummary['grade']): string {
  switch (grade) {
    case 'high':
      return 'bg-red-500/80 text-white';
    case 'moderate':
      return 'bg-amber-500/80 text-white';
    default:
      return 'bg-emerald-500/80 text-white';
  }
}

function gradeToLabel(grade: PrivacyAuditSummary['grade']): string {
  switch (grade) {
    case 'high':
      return 'High risk';
    case 'moderate':
      return 'Watch';
    default:
      return 'Clean';
  }
}

export function PrivacySentinelBadge() {
  const activeTabId = useTabsStore((state) => state.activeId);
  const [audit, setAudit] = useState<PrivacyAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);

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

  const label = useMemo(() => {
    if (loading) return 'Scanning…';
    if (!audit) return 'No data';
    return gradeToLabel(audit.grade);
  }, [audit, loading]);

  const tooltip = useMemo(() => {
    if (!audit) return 'Privacy Sentinel has no data for this tab yet.';
    const lines = [audit.message];
    if (audit.trackers.length > 0) {
      lines.push(`Trackers: ${audit.trackers.slice(0, 3).map(t => t.host).join(', ')}`);
    }
    if (audit.thirdPartyHosts.length > 0) {
      lines.push(`3rd-party: ${audit.thirdPartyHosts.slice(0, 3).map(t => t.host).join(', ')}`);
    }
    lines.push(...audit.suggestions);
    return lines.join('\n');
  }, [audit]);

  const gradeClass = audit ? gradeToColor(audit.grade) : 'bg-slate-500/70 text-white';

  return (
    <button
      type="button"
      className={`no-drag flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${gradeClass}`}
      title={tooltip}
      onClick={runAudit}
    >
      <span className="inline-flex h-2 w-2 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-current" />
      </span>
      <span>{label}</span>
    </button>
  );
}
