/**
 * Consent Timeline - Visual history of privacy decisions
 * Unique feature: Ethical transparency > Comet's opacity
 */

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';

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

export function ConsentTimelineView() {
  const { consentTimeline, refresh, loading } = useTrustDashboardStore();

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const groupedTimeline = useMemo(() => {
    const groups: Record<string, typeof consentTimeline> = {};
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    consentTimeline.forEach((record) => {
      const age = now - record.timestamp;
      let group: string;

      if (age < oneHour) {
        group = 'Last hour';
      } else if (age < oneDay) {
        group = 'Today';
      } else if (age < 7 * oneDay) {
        group = 'This week';
      } else if (age < 30 * oneDay) {
        group = 'This month';
      } else {
        group = 'Older';
      }

      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(record);
    });

    return Object.entries(groups).map(([label, items]) => ({
      label,
      items: items.sort((a, b) => b.timestamp - a.timestamp),
    }));
  }, [consentTimeline]);

  if (loading && consentTimeline.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-400">Loading consent timeline…</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f111a] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-300/80">
            <Shield size={14} />
            Consent Timeline
          </div>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-white">Privacy Decisions History</h1>
          <p className="mt-1 text-sm text-gray-400">
            Complete audit trail of all consent requests and approvals
          </p>
        </header>

        {consentTimeline.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-8 sm:p-12 text-center">
            <Clock size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No consent activity yet</h3>
            <p className="text-sm text-gray-500">
              Privacy decisions will appear here as you browse and interact with sites.
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {groupedTimeline.map((group) => (
              <section key={group.label} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group.label}</h2>
                <div className="space-y-2">
                  {group.items.map((record) => {
                    const status = record.revokedAt
                      ? { label: 'Revoked', icon: XCircle, tone: 'text-red-300 border-red-400/40 bg-red-500/10' }
                      : record.approved
                        ? { label: 'Approved', icon: ShieldCheck, tone: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' }
                        : { label: 'Pending', icon: Clock, tone: 'text-amber-300 border-amber-400/40 bg-amber-500/10' };

                    const riskIcon =
                      record.action.risk === 'high'
                        ? AlertTriangle
                        : record.action.risk === 'medium'
                          ? ShieldAlert
                          : CheckCircle2;

                    const RiskIcon = riskIcon;
                    const StatusIcon = status.icon;

                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-3 sm:p-4 hover:bg-slate-900/90 transition-colors"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-900/80">
                            <RiskIcon size={18} className="sm:w-5 sm:h-5 text-emerald-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base text-gray-200">
                                {ACTION_LABELS[record.action.type] ?? record.action.type}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 mb-2">{record.action.description}</div>
                            {record.action.target && (
                              <div className="text-xs text-slate-500 truncate" title={record.action.target}>
                                {record.action.target}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 sm:px-2.5 py-1 text-xs ${status.tone}`}>
                              <StatusIcon size={12} />
                              <span className="hidden sm:inline">{status.label}</span>
                            </span>
                            {record.revokedAt && (
                              <span className="text-xs text-red-400">
                                Revoked {formatDistanceToNow(record.revokedAt, { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

