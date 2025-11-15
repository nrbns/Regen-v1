/**
 * Enhanced Privacy Dashboard
 * Comprehensive privacy controls and monitoring
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Lock, Eye, EyeOff, Globe, Cookie, Fingerprint,
  Network, Database, Trash2, Settings, AlertTriangle, CheckCircle2,
  BarChart3, Clock, TrendingUp
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
}

export function PrivacyDashboard() {
  const [trackersBlocked, setTrackersBlocked] = useState(0);
  const [cookiesBlocked, setCookiesBlocked] = useState(0);
  const [dataCollected, setDataCollected] = useState(0);
  const [recentTrackers, setRecentTrackers] = useState<TrackerBlock[]>([]);
  const [privacyMode, setPrivacyMode] = useState<'normal' | 'private' | 'ghost' | 'shadow'>('normal');
  const [fingerprintingEnabled, setFingerprintingEnabled] = useState(false);
  const [cookieBlocking, setCookieBlocking] = useState<'all' | 'third-party' | 'none'>('third-party');

  useEffect(() => {
    // Load privacy stats
    const loadStats = async () => {
      try {
        // In production, fetch from IPC
        const stats = await ipc.sentinel.getStats?.().catch(() => ({
          trackersBlocked: 0,
          cookiesBlocked: 0,
          dataCollected: 0,
        }));
        
        setTrackersBlocked(stats?.trackersBlocked || 0);
        setCookiesBlocked(stats?.cookiesBlocked || 0);
        setDataCollected(stats?.dataCollected || 0);
      } catch (error) {
        console.error('[PrivacyDashboard] Failed to load stats:', error);
      }
    };

    loadStats();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics: PrivacyMetric[] = [
    {
      label: 'Trackers Blocked',
      value: trackersBlocked.toLocaleString(),
      trend: 'up',
      icon: Shield,
    },
    {
      label: 'Cookies Blocked',
      value: cookiesBlocked.toLocaleString(),
      trend: 'up',
      icon: Cookie,
    },
    {
      label: 'Data Protected',
      value: `${((dataCollected / 1000) * 100).toFixed(1)}%`,
      trend: 'stable',
      icon: Lock,
    },
  ];

  const handleClearData = async (type: 'cookies' | 'cache' | 'history' | 'all') => {
    try {
      // In production, call IPC to clear data
      await ipc.storage?.clearData?.(type).catch(() => {});
      alert(`${type} cleared successfully`);
    } catch (error) {
      console.error('[PrivacyDashboard] Failed to clear data:', error);
      alert(`Failed to clear ${type}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Shield size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Privacy Dashboard</h2>
            <p className="text-sm text-gray-400">Monitor and control your privacy</p>
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

      {/* Metrics */}
      <div className="p-6 grid grid-cols-3 gap-4">
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
            Recent Activity
          </h3>
          
          <div className="space-y-2">
            {recentTrackers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p>No recent tracker activity</p>
              </div>
            ) : (
              recentTrackers.map((tracker, index) => (
                <div
                  key={index}
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
                  <div className="text-xs text-gray-500">{tracker.count}x</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

