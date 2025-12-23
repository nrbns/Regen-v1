/**
 * Features Hub - Central access point for all v1 features
 */

import { useState, useEffect } from 'react';
import { Sparkles, PanelRight, Columns, Lock, Zap, Palette, Cloud, Code, X } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { EnhancedRegenSidebar } from '../regen/EnhancedRegenSidebar';
import { SplitView } from '../split-view/SplitView';
import { RegenVault } from '../vault/RegenVault';
import { ThemeEngine } from '../themes/ThemeEngine';
import { AIDeveloperConsole } from '../dev-console/AIDeveloperConsole';
import { LightningMode } from '../../core/lightning/LightningMode';
import { toast } from '../../utils/toast';

type FeatureView = 'sidebar' | 'split' | 'vault' | 'lightning' | 'theme' | 'sync' | 'dev' | null;

export function FeaturesHub() {
  const [activeFeature, setActiveFeature] = useState<FeatureView>(null);
  const { regenSidebarOpen, setRegenSidebarOpen } = useAppStore();

  // Keyboard shortcut: Cmd/Ctrl + ~ to toggle Developer Console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey;
      if ((modifier && e.key === '`') || (modifier && e.shiftKey && e.key === '~')) {
        e.preventDefault();
        setActiveFeature(prev => (prev === 'dev' ? null : 'dev'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const features = [
    { id: 'sidebar' as FeatureView, icon: PanelRight, label: 'Regen Sidebar', color: 'purple' },
    { id: 'split' as FeatureView, icon: Columns, label: 'Split View', color: 'blue' },
    { id: 'vault' as FeatureView, icon: Lock, label: 'Regen Vault', color: 'green' },
    { id: 'lightning' as FeatureView, icon: Zap, label: 'Lightning Mode', color: 'yellow' },
    { id: 'theme' as FeatureView, icon: Palette, label: 'Theme Engine', color: 'pink' },
    { id: 'sync' as FeatureView, icon: Cloud, label: 'Sync Cloud', color: 'cyan' },
    { id: 'dev' as FeatureView, icon: Code, label: 'Dev Console', color: 'orange' },
  ];

  return (
    <>
      {/* Features Access Panel */}
      {!activeFeature && (
        <div className="fixed right-6 top-20 z-50 max-w-xs rounded-2xl border border-purple-500/50 bg-gray-900 p-4 shadow-2xl md:right-8 md:top-[72px]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Features
            </h3>
            <button
              onClick={() => setActiveFeature(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => {
                    if (feature.id === 'sidebar') {
                      setRegenSidebarOpen(true);
                    } else {
                      setActiveFeature(feature.id);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gray-800 p-2 transition-colors hover:bg-gray-700"
                >
                  <Icon className={`h-5 w-5 text-${feature.color}-400`} />
                  <span className="text-sm text-white">{feature.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Views */}
      {activeFeature === 'split' && (
        <div className="fixed inset-0 z-[100] bg-gray-900">
          <SplitView />
          <button
            onClick={() => setActiveFeature(null)}
            className="absolute right-4 top-4 z-[101] rounded-lg bg-gray-800 p-2 text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {activeFeature === 'vault' && (
        <div className="fixed inset-0 z-[100] bg-gray-900">
          <RegenVault />
          <button
            onClick={() => setActiveFeature(null)}
            className="absolute right-4 top-4 z-[101] rounded-lg bg-gray-800 p-2 text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {activeFeature === 'theme' && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-900">
          <div className="mx-auto max-w-4xl p-8">
            <ThemeEngine />
            <button
              onClick={() => setActiveFeature(null)}
              className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {activeFeature === 'dev' && (
        <div className="fixed inset-0 z-[100] bg-gray-900">
          <AIDeveloperConsole />
          <button
            onClick={() => setActiveFeature(null)}
            className="absolute right-4 top-4 z-[101] rounded-lg bg-gray-800 p-2 text-white hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Lightning Mode Toggle */}
      {activeFeature === 'lightning' && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-yellow-500/50 bg-gray-900 p-4 shadow-2xl">
          <div className="mb-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">Lightning Mode</h3>
          </div>
          <button
            onClick={() => {
              if (LightningMode.isEnabled()) {
                LightningMode.disable();
                toast.success('Lightning Mode disabled');
              } else {
                LightningMode.enable();
                toast.success('Lightning Mode enabled - faster browsing!');
              }
              setActiveFeature(null);
            }}
            className={`w-full rounded-lg px-4 py-2 font-semibold ${
              LightningMode.isEnabled()
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            {LightningMode.isEnabled() ? 'Disable' : 'Enable'} Lightning Mode
          </button>
        </div>
      )}

      {/* Sync Cloud Settings */}
      {activeFeature === 'sync' && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-cyan-500/50 bg-gray-900 p-4 shadow-2xl">
          <div className="mb-3 flex items-center gap-3">
            <Cloud className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Sync Cloud</h3>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            Sync bookmarks, history, and settings across devices
          </p>
          <input
            type="text"
            placeholder="User ID"
            className="mb-2 w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            placeholder="Sync Token"
            className="mb-3 w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={() => {
              toast.info('Sync feature - configure your sync endpoint');
              setActiveFeature(null);
            }}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700"
          >
            Enable Sync
          </button>
        </div>
      )}

      {/* Enhanced Sidebar */}
      {regenSidebarOpen && (
        <div className="fixed bottom-0 right-0 top-0 z-[90] w-96">
          <EnhancedRegenSidebar />
        </div>
      )}
    </>
  );
}
