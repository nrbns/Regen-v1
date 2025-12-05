/**
 * Privacy Dashboard Component
 * Shows trust levels and privacy controls
 */

import { useState, useEffect } from 'react';
import { trustControls, type TrustLevel } from '../../core/privacy/trustControls';
import type { TrustRecord } from '../../core/privacy/trustControls';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TRUST_LEVEL_COLORS: Record<TrustLevel, string> = {
  trusted: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
  neutral: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
  untrusted: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
  blocked: 'text-red-400 bg-red-500/20 border-red-500/40',
};

const TRUST_LEVEL_ICONS: Record<TrustLevel, typeof Shield> = {
  trusted: ShieldCheck,
  neutral: Shield,
  untrusted: ShieldAlert,
  blocked: ShieldOff,
};

export function PrivacyDashboard() {
  const [records, setRecords] = useState<TrustRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load records
    trustControls.loadFromStorage();
    setRecords(trustControls.getAllRecords());
  }, []);

  const handleSetTrust = (domain: string, level: TrustLevel) => {
    trustControls.setTrustLevel(domain, level);
    setRecords(trustControls.getAllRecords());
  };

  const handleAudit = async (domain: string) => {
    const audit = await trustControls.auditPrivacy(domain);
    console.log('[PrivacyDashboard] Audit result:', audit);
    // Could show audit results in a modal or toast
  };

  const filteredRecords = records.filter(record =>
    record.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Privacy Dashboard</h2>
          <p className="text-sm text-gray-400">Manage domain trust levels and privacy settings</p>
        </div>
        <button
          onClick={() => {
            trustControls.clearRecords();
            setRecords([]);
          }}
          className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-400 transition hover:bg-red-500/20"
        >
          <Trash2 size={16} />
          Clear All
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search domains..."
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Trust Records */}
      <div className="space-y-2">
        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            {searchQuery ? 'No domains found' : 'No trust records yet'}
          </div>
        ) : (
          filteredRecords.map(record => {
            const Icon = TRUST_LEVEL_ICONS[record.trustLevel];
            return (
              <motion.div
                key={record.domain}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 p-4"
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className={`rounded-lg border p-2 ${TRUST_LEVEL_COLORS[record.trustLevel]}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-200">{record.domain}</div>
                    <div className="text-xs text-gray-400">
                      Score: {record.privacyScore}/100 • Visits: {record.visitCount}
                    </div>
                    {record.violations.length > 0 && (
                      <div className="mt-1 text-xs text-red-400">
                        {record.violations.length} violation(s)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAudit(record.domain)}
                    className="rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-neutral-600"
                  >
                    Audit
                  </button>
                  <select
                    value={record.trustLevel}
                    onChange={e => handleSetTrust(record.domain, e.target.value as TrustLevel)}
                    className="rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="trusted">Trusted</option>
                    <option value="neutral">Neutral</option>
                    <option value="untrusted">Untrusted</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}



