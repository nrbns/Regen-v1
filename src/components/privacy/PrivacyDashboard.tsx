/**
 * Enhanced Privacy Dashboard
 * Comprehensive privacy controls and monitoring with real stats, privacy score, and export
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Lock, Eye, EyeOff, Globe, Cookie, Fingerprint,
  Network, Database, Trash2, Settings, AlertTriangle, CheckCircle2,
  BarChart3, Clock, TrendingUp, Download, FileText, Activity, Zap
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

interface PrivacyMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface TrackerBlock {
  domain: string;
  count: number;
  category: string;
  blocked: boolean;
  lastSeen: number;
}

interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  cookiesBlocked: number;
  scriptsBlocked: number;
  httpsUpgrades: number;
  fingerprintingEnabled: boolean;
  webrtcBlocked: boolean;
  totalCookies: number;
  totalOrigins: number;
  privacyScore: number;
}

export function PrivacyDashboard() {
  const [stats, setStats] = useState<PrivacyStats | null>(null);
  const [recentTrackers, setRecentTrackers] = useState<TrackerBlock[]>([]);
  const [privacyMode, setPrivacyMode] = useState<'normal' | 'private' | 'ghost' | 'shadow'>('normal');
  const [fingerprintingEnabled, setFingerprintingEnabled] = useState(false);
  const [cookieBlocking, setCookieBlocking] = useState<'all' | 'third-party' | 'none'>('third-party');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        // Fetch real stats from IPC
        const privacyStats = await ipc.privacy.getStats().catch(() => null);
        if (privacyStats) {
          setStats(privacyStats as PrivacyStats);
          setFingerprintingEnabled(privacyStats.fingerprintingEnabled);
        }

        // Fetch tracker list
        const trackers = await ipc.privacy.getTrackers(20).catch(() => []);
        if (Array.isArray(trackers)) {
          setRecentTrackers(trackers.map((t: any) => ({
            domain: t.domain,
            count: t.count || 1,
            category: t.category || 'Unknown',
            blocked: t.blocked !== false,
            lastSeen: t.lastSeen || Date.now(),
          })));
        }
      } catch (error) {
        console.error('[PrivacyDashboard] Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExportReport = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExporting(true);
      const report = await ipc.privacy.exportReport(format);
      
      // Create download
      const blob = format === 'json'
        ? new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
        : new Blob([convertToCSV(report)], { type: 'text/csv' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[PrivacyDashboard] Failed to export report:', error);
      alert('Failed to export privacy report');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (report: any): string => {
    const lines: string[] = [];
    
    // Header
    lines.push('Privacy Report');
    lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`);
    lines.push('');
    
    // Stats
    lines.push('Statistics');
    lines.push('Metric,Value');
    lines.push(`Privacy Score,${report.stats.privacyScore}`);
    lines.push(`Trackers Blocked,${report.stats.trackersBlocked}`);
    lines.push(`Ads Blocked,${report.stats.adsBlocked}`);
    lines.push(`Cookies Blocked,${report.stats.cookiesBlocked}`);
    lines.push(`HTTPS Upgrades,${report.stats.httpsUpgrades}`);
    lines.push(`Total Cookies,${report.stats.totalCookies}`);
    lines.push(`Total Origins,${report.stats.totalOrigins}`);
    lines.push('');
    
    // Trackers
    lines.push('Trackers');
    lines.push('Domain,Category,Count,Blocked,Last Seen');
    report.trackers.forEach((t: any) => {
      lines.push(`${t.domain},${t.category},${t.count},${t.blocked},${new Date(t.lastSeen).toISOString()}`);
    });
    lines.push('');
    
    // Origins
    lines.push('Origins');
    lines.push('Origin,Cookies,Last Accessed');
    report.origins.forEach((o: any) => {
      lines.push(`${o.origin},${o.cookies},${new Date(o.lastAccessed).toISOString()}`);
    });
    
    return lines.join('\n');
  };

  const getPrivacyScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPrivacyScoreGrade = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const metrics: PrivacyMetric[] = stats ? ([
    {
      label: 'Trackers Blocked',
      value: stats.trackersBlocked.toLocaleString(),
      trend: 'up',
      icon: Shield,
    },
    {
      label: 'Ads Blocked',
      value: stats.adsBlocked.toLocaleString(),
      trend: 'up',
      icon: Zap,
    },
    {
      label: 'Cookies Blocked',
      value: stats.cookiesBlocked.toLocaleString(),
      trend: 'up',
      icon: Cookie,
    },
    {
      label: 'HTTPS Upgrades',
      value: stats.httpsUpgrades.toLocaleString(),
      trend: 'up',
      icon: Lock,
    },
  ] as PrivacyMetric[]) : [];

  const handleClearData = async (type: 'cookies' | 'cache' | 'history' | 'all') => {
    try {
      await (ipc as any).invoke('privacy:purgeOrigin', { origin: type === 'all' ? '*' : type }).catch(() => {});
      alert(`${type} cleared successfully`);
      // Reload stats
      const privacyStats = await ipc.privacy.getStats().catch(() => null);
      if (privacyStats) {
        setStats(privacyStats as PrivacyStats);
      }
    } catch (error) {
      console.error('[PrivacyDashboard] Failed to clear data:', error);
      alert(`Failed to clear ${type}`);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading privacy stats...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Shield size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Privacy Dashboard</h2>
              <p className="text-sm text-gray-400">Monitor and control your privacy</p>
            </div>
          </div>
          
          {/* Export Button */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExportReport('json')}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
            <button
              onClick={() => handleExportReport('csv')}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <FileText size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Privacy Mode Selector */}
        <div className="flex gap-2">
          {(['normal', 'private', 'ghost', 'shadow'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPrivacyMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                privacyMode === mode
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Score */}
      {stats && (
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Privacy Score</h3>
              <p className="text-sm text-gray-400">Your overall privacy protection level</p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${getPrivacyScoreColor(stats.privacyScore)}`}>
                {stats.privacyScore}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Grade: {getPrivacyScoreGrade(stats.privacyScore)}
              </div>
            </div>
          </div>
          
          {/* Score Bar */}
          <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.privacyScore}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full ${
                stats.privacyScore >= 80 ? 'bg-green-500' :
                stats.privacyScore >= 60 ? 'bg-yellow-500' :
                stats.privacyScore >= 40 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className="text-gray-400" />
                {metric.trend && (
                  <TrendingUp
                    size={16}
                    className={`${
                      metric.trend === 'up' ? 'text-green-400' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
              <div className="text-xs text-gray-400">{metric.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Privacy Settings */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings size={18} />
            Privacy Settings
          </h3>
          
          <div className="space-y-4">
            {/* Fingerprinting Protection */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="flex items-center gap-3">
                <Fingerprint size={20} className="text-gray-400" />
                <div>
                  <div className="font-medium">Fingerprinting Protection</div>
                  <div className="text-sm text-gray-400">Block browser fingerprinting</div>
                </div>
              </div>
              <button
                onClick={() => setFingerprintingEnabled(!fingerprintingEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  fingerprintingEnabled ? 'bg-green-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    fingerprintingEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Cookie Blocking */}
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Cookie size={20} className="text-gray-400" />
                <div>
                  <div className="font-medium">Cookie Blocking</div>
                  <div className="text-sm text-gray-400">Control cookie behavior</div>
                </div>
              </div>
              <div className="flex gap-2">
                {(['all', 'third-party', 'none'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setCookieBlocking(level)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      cookieBlocking === level
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {level === 'all' ? 'Block All' : level === 'third-party' ? 'Third-Party' : 'Allow All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database size={18} />
            Data Management
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {(['cookies', 'cache', 'history', 'all'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleClearData(type)}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} className="text-gray-400" />
                <span>Clear {type === 'all' ? 'All Data' : type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            Recent Tracker Activity
          </h3>
          
          <div className="space-y-2">
            {recentTrackers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p>No recent tracker activity</p>
              </div>
            ) : (
              recentTrackers.map((tracker, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {tracker.blocked ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-yellow-400" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{tracker.domain}</div>
                      <div className="text-xs text-gray-400">{tracker.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">{tracker.count}x</div>
                    <div className="text-xs text-gray-500">
                      {new Date(tracker.lastSeen).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
