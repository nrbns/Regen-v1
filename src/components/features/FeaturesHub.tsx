/**
 * Features Hub - Central access point for all v1 features
 */

import { useState } from 'react';
import { 
  Sparkles, 
  PanelRight, 
  Columns, 
  Lock, 
  Zap, 
  Palette, 
  Cloud, 
  Code,
  X 
} from 'lucide-react';
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
        <div className="fixed bottom-20 left-4 z-50 bg-gray-900 border border-purple-500/50 rounded-2xl p-4 shadow-2xl max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Features
            </h3>
            <button
              onClick={() => setActiveFeature(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
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
                  className="w-full flex items-center gap-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Icon className={`w-5 h-5 text-${feature.color}-400`} />
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
            className="absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {activeFeature === 'vault' && (
        <div className="fixed inset-0 z-[100] bg-gray-900">
          <RegenVault />
          <button
            onClick={() => setActiveFeature(null)}
            className="absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {activeFeature === 'theme' && (
        <div className="fixed inset-0 z-[100] bg-gray-900 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            <ThemeEngine />
            <button
              onClick={() => setActiveFeature(null)}
              className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
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
            className="absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Lightning Mode Toggle */}
      {activeFeature === 'lightning' && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-yellow-500/50 rounded-lg p-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
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
            className={`w-full px-4 py-2 rounded-lg font-semibold ${
              LightningMode.isEnabled()
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {LightningMode.isEnabled() ? 'Disable' : 'Enable'} Lightning Mode
          </button>
        </div>
      )}

      {/* Sync Cloud Settings */}
      {activeFeature === 'sync' && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-cyan-500/50 rounded-lg p-4 shadow-2xl max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Sync Cloud</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Sync bookmarks, history, and settings across devices
          </p>
          <input
            type="text"
            placeholder="User ID"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm mb-2"
          />
          <input
            type="password"
            placeholder="Sync Token"
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm mb-3"
          />
          <button
            onClick={() => {
              toast.info('Sync feature - configure your sync endpoint');
              setActiveFeature(null);
            }}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
          >
            Enable Sync
          </button>
        </div>
      )}

      {/* Enhanced Sidebar */}
      {regenSidebarOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-96 z-[90]">
          <EnhancedRegenSidebar />
        </div>
      )}
    </>
  );
}


