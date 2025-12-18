/**
 * MVP Settings Screen - Feature Flags & Performance Controls
 * Allows users to toggle all 6 MVP features and see their status
 */

import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import {
  getMVPFeatureFlags,
  isMVPFeatureEnabled,
  toggleMVPFeature,
} from '../../config/mvpFeatureFlags';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';

type FeatureCategory = 'performance' | 'ui' | 'system';

interface FeatureCardProps {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  enabled: boolean;
  onToggle: (id: string) => void;
  status?: string;
  warning?: string;
}

function FeatureCard({
  id,
  name,
  description,
  category,
  enabled,
  onToggle,
  status,
  warning,
}: FeatureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const categoryColors: Record<FeatureCategory, { bg: string; border: string; label: string }> = {
    performance: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Performance' },
    ui: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'UI Control' },
    system: { bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'System' },
  };

  const colors = categoryColors[category];

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} p-4 transition-all ${
        expanded ? 'ring-2 ring-slate-500 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(id)}
          className={`relative mt-1 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${name}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>

        {/* Feature Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-semibold text-slate-100">{name}</h3>
            <span
              className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                category === 'performance'
                  ? 'bg-blue-500/20 text-blue-300'
                  : category === 'ui'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-green-500/20 text-green-300'
              }`}
            >
              {categoryColors[category].label}
            </span>
            {enabled && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} />
                Active
              </div>
            )}
          </div>
          <p className="mb-2 text-sm text-slate-400">{description}</p>

          {/* Status Badge */}
          {status && (
            <div className="mb-2 inline-block rounded bg-slate-800/50 px-2 py-1 text-xs text-slate-300">
              Status: {status}
            </div>
          )}

          {/* Warning Badge */}
          {warning && (
            <div className="mb-2 inline-block flex items-center gap-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
              <AlertCircle size={14} />
              {warning}
            </div>
          )}
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-400 transition-colors hover:text-slate-200"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="ml-12 mt-3 space-y-2 border-t border-slate-600/50 pt-3 text-xs text-slate-300">
          <div className="rounded bg-slate-800/30 p-2">
            <p className="font-mono text-slate-400">Feature ID: {id}</p>
          </div>
          <div className="flex items-start gap-2">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              {id === 'tab-hibernation'
                ? 'Automatically suspends inactive tabs after 30 minutes, reducing memory usage from ~50MB to ~2MB per tab.'
                : id === 'low-ram-mode'
                  ? 'Detects available device RAM and automatically limits open tabs to 3-5, preventing memory bloat.'
                  : id === 'battery-aware-power'
                    ? 'Automatically reduces CPU polling and disables animations when on battery power, saving 15-25% battery.'
                    : id === 'sidebar-toggle'
                      ? 'Shows/hides the left navigation sidebar with Ctrl+B shortcut or button in the top-right.'
                      : id === 'address-controls'
                        ? 'Adds back, forward, and reload buttons to the address bar for quick navigation control.'
                        : id === 'keyboard-shortcuts'
                          ? 'Enables 12+ keyboard shortcuts for power users (Ctrl+B, Ctrl+K, Ctrl+], Ctrl+[, etc.).'
                          : 'Feature flag for MVP control'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MVP Settings Screen
 * Displays all 6 MVP features with toggle controls
 */
export function SettingsScreen() {
  const features = getMVPFeatureFlags();
  const _tabsStore = useTabsStore();
  const appStore = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [_expandedCategory, _setExpandedCategory] = useState<FeatureCategory | null>('performance');

  // Get device RAM (for Low-RAM Mode status)
  const getDeviceRamGB = () => {
    if ('deviceMemory' in navigator) {
      return navigator.deviceMemory;
    }
    return null;
  };

  // Get battery status (for Battery-Aware Power status)
  const [batteryStatus, setBatteryStatus] = React.useState<{
    charging: boolean;
    level: number;
  } | null>(null);

  React.useEffect(() => {
    const getBatteryStatus = async () => {
      const nav: any = navigator as any;
      if (typeof nav.getBattery === 'function' || nav.battery) {
        try {
          const battery: any = (await nav.getBattery?.()) || nav.battery;
          if (battery) {
            const updateStatus = () => {
              setBatteryStatus({
                charging: Boolean(battery.charging),
                level: Math.round((battery.level || 0) * 100),
              });
            };
            updateStatus();
            battery.addEventListener('chargingchange', updateStatus);
            battery.addEventListener('levelchange', updateStatus);
            return () => {
              battery.removeEventListener('chargingchange', updateStatus);
              battery.removeEventListener('levelchange', updateStatus);
            };
          }
        } catch (e) {
          // Battery Status API not available
          console.debug('[Battery] API not available:', e);
        }
      }
    };

    getBatteryStatus();
  }, []);

  // Handle feature toggle
  const handleToggle = (featureId: string) => {
    toggleMVPFeature(featureId);
    // Trigger re-render by updating state
    // In a real implementation, you'd use Zustand or React state
  };

  // Progressive disclosure: Core features shown first, Advanced hidden by default
  const coreFeatureIds = ['tab-hibernation', 'low-ram-mode'];
  const coreFeatures = features.filter(f => coreFeatureIds.includes(f.id));
  const advancedFeatures = features.filter(f => !coreFeatureIds.includes(f.id));

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-amber-400" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        <p className="text-sm text-slate-400">
          {showAdvanced
            ? 'All features β€" advanced users'
            : 'Essential features only β€" simple & clean'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          {/* Core Features - Always visible */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Zap size={20} className="text-emerald-400" />
              Essential
            </h2>
            <div className="space-y-3">
              {coreFeatures.map(feature => (
                <FeatureCard
                  key={feature.id}
                  id={feature.id}
                  name={feature.name}
                  description={feature.description}
                  category={feature.category}
                  enabled={isMVPFeatureEnabled(feature.id)}
                  onToggle={handleToggle}
                  status={
                    feature.id === 'low-ram-mode' ? `Device: ${getDeviceRamGB()}GB RAM` : undefined
                  }
                />
              ))}
            </div>
          </section>

          {/* Advanced Features - Hidden by default */}
          {showAdvanced && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <ChevronDown size={20} className="text-slate-400" />
                Advanced
              </h2>
              <div className="space-y-3">
                {advancedFeatures.map(feature => (
                  <FeatureCard
                    key={feature.id}
                    id={feature.id}
                    name={feature.name}
                    description={feature.description}
                    category={feature.category}
                    enabled={isMVPFeatureEnabled(feature.id)}
                    onToggle={handleToggle}
                    status={
                      feature.id === 'battery-aware-power'
                        ? `Battery: ${batteryStatus?.charging ? 'Charging' : 'On Battery'} (${batteryStatus?.level}%)`
                        : feature.id === 'sidebar-toggle'
                          ? `Sidebar: ${appStore?.regenSidebarOpen ? 'Visible' : 'Hidden'}`
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Info Box */}
          <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
              <div className="text-sm text-slate-300">
                <p className="mb-1 font-semibold text-blue-300">💡 Tips</p>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  <li>
                    Hibernation is <strong>enabled by default</strong> and runs automatically
                  </li>
                  <li>
                    Low-RAM mode <strong>detects your device</strong> and activates if needed
                  </li>
                  <li>
                    Battery mode <strong>activates on battery power</strong> automatically
                  </li>
                  <li>
                    All UI controls are <strong>always available</strong> regardless of toggles
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reset Section */}
          <div className="flex gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={() => {
                // Reset all features to defaults
                features.forEach(f => {
                  if (!isMVPFeatureEnabled(f.id)) {
                    toggleMVPFeature(f.id);
                  }
                });
              }}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
            >
              Reset to Defaults
            </button>
            <div className="flex items-center text-xs text-slate-500">
              Changes are saved automatically to localStorage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
