import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react';
import { 
  Sparkles, 
  PanelRight, 
  Columns, 
  Lock, 
  Zap, 
  Palette, 
  Cloud, 
  Code,
} from 'lucide-react';
import { useAppStore } from '../../../state/appStore';
import { isV1ModeEnabled } from '../../../config/mvpFeatureFlags';
import { SplitView } from '../../../components/split-view/SplitView';
import { RegenVault } from '../../../components/vault/RegenVault';
import { ThemeEngine } from '../../../components/themes/ThemeEngine';
// Lazy-load heavy/demo components only when not in v1-mode
const LazyAIDeveloperConsole = !isV1ModeEnabled()
  ? lazy(() => import('../../../components/dev-console/AIDeveloperConsole').then(m => ({ default: m.AIDeveloperConsole })))
  : null;

const LazyEnhancedRegenSidebar = !isV1ModeEnabled()
  ? lazy(() => import('../../../components/regen/EnhancedRegenSidebar').then(m => ({ default: m.EnhancedRegenSidebar })))
  : null;
import { LightningMode } from '../../../core/lightning/LightningMode';
import { toast } from '../../../utils/toast';
import { useTokens } from '../../useTokens';

type FeatureView = 'sidebar' | 'split' | 'vault' | 'lightning' | 'theme' | 'sync' | 'dev' | null;

export function FeaturesMenu() {
  const tokens = useTokens();
  const [open, setOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureView>(null);
  const { regenSidebarOpen, setRegenSidebarOpen } = useAppStore();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        closeMenu();
      }
    }
    window.addEventListener('pointerdown', handlePointer);
    return () => window.removeEventListener('pointerdown', handlePointer);
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeMenu, open]);

  const features = [
    { id: 'sidebar' as FeatureView, icon: PanelRight, label: 'Regen Sidebar', color: 'purple' },
    { id: 'split' as FeatureView, icon: Columns, label: 'Split View', color: 'blue' },
    { id: 'vault' as FeatureView, icon: Lock, label: 'Regen Vault', color: 'green' },
    { id: 'lightning' as FeatureView, icon: Zap, label: 'Lightning Mode', color: 'yellow' },
    { id: 'theme' as FeatureView, icon: Palette, label: 'Theme Engine', color: 'pink' },
    { id: 'sync' as FeatureView, icon: Cloud, label: 'Sync Cloud', color: 'cyan' },
    { id: 'dev' as FeatureView, icon: Code, label: 'Dev Console', color: 'orange' },
  ];

  const handleFeatureClick = (featureId: FeatureView) => {
    if (featureId === 'sidebar') {
      setRegenSidebarOpen(true);
      closeMenu();
    } else if (featureId === 'lightning') {
      if (LightningMode.isEnabled()) {
        LightningMode.disable();
        toast.success('Lightning Mode disabled');
      } else {
        LightningMode.enable();
        toast.success('Lightning Mode enabled - faster browsing!');
      }
      closeMenu();
    } else if (featureId === 'sync') {
      toast.info('Sync feature - configure your sync endpoint');
      closeMenu();
    } else {
      setActiveFeature(featureId);
      closeMenu();
    }
  };

  // If v1-mode is enabled, hide demo-only features like the sidebar and dev console
  const visibleFeatures = isV1ModeEnabled()
    ? features.filter(f => f.id !== 'sidebar' && f.id !== 'dev')
    : features;

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Features menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]"
          onClick={e => {
            e.stopPropagation();
            if ((e.nativeEvent as any)?.stopImmediatePropagation) {
              (e.nativeEvent as any).stopImmediatePropagation();
            }
            setOpen(value => !value);
          }}
          onMouseDown={e => {
            e.stopPropagation();
            if ((e.nativeEvent as any)?.stopImmediatePropagation) {
              (e.nativeEvent as any).stopImmediatePropagation();
            }
          }}
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </button>

        {open && (
          <div
            ref={panelRef}
            role="menu"
            aria-label="Features"
            className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-purple-500/50 bg-[var(--surface-panel)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Features</p>
              </div>
            </div>

            <div className="space-y-1 px-2 py-2" style={{ fontSize: tokens.fontSize.sm }}>
              {visibleFeatures.map(feature => {
                const Icon = feature.icon;
                const colorClass = {
                  purple: 'text-purple-400',
                  blue: 'text-blue-400',
                  green: 'text-green-400',
                  yellow: 'text-yellow-400',
                  pink: 'text-pink-400',
                  cyan: 'text-cyan-400',
                  orange: 'text-orange-400',
                }[feature.color] || 'text-gray-400';

                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (e.nativeEvent?.stopImmediatePropagation) {
                        e.nativeEvent.stopImmediatePropagation();
                      }
                      handleFeatureClick(feature.id);
                    }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      if (e.nativeEvent?.stopImmediatePropagation) {
                        e.nativeEvent.stopImmediatePropagation();
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                    style={{ zIndex: 10011, isolation: 'isolate' }}
                  >
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                    <span>{feature.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Feature Views */}
      {activeFeature === 'split' && (
        <div className="fixed inset-0 z-[100] bg-gray-900">
          <SplitView />
          <button
            onClick={() => setActiveFeature(null)}
            className="absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            ×
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
            ×
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
            ×
          </button>
        </div>
      )}

      {/* Enhanced Sidebar (lazy) */}
      {regenSidebarOpen && !isV1ModeEnabled() && LazyEnhancedRegenSidebar && (
        <div className="fixed right-0 top-0 bottom-0 w-96 z-[90]">
          <Suspense fallback={null}>
            <LazyEnhancedRegenSidebar />
          </Suspense>
        </div>
      )}
    </>
  );
}

