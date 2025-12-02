import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Settings2, Moon, SunMedium, MonitorCog, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../../theme';
import { useTokens } from '../../useTokens';
import { useSettingsStore } from '../../../state/settingsStore';
import { applyPerformanceMode } from '../../../utils/performanceMode';

type ThemePreference = 'system' | 'light' | 'dark';

export function SettingsMenu() {
  const tokens = useTokens();
  const { setPreference } = useTheme();
  const navigate = useNavigate();
  const settingsStore = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Get current settings from centralized store
  const currentTheme =
    settingsStore.appearance.theme === 'system'
      ? 'system'
      : settingsStore.appearance.theme === 'light'
        ? 'light'
        : 'dark';
  const privacyMode =
    settingsStore.privacy.trackerProtection && settingsStore.privacy.adBlockEnabled;
  const performanceMode = settingsStore.appearance.compactUI; // Using compactUI as a proxy for performance mode

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

  const handleThemeChange = useCallback(
    (theme: ThemePreference) => {
      setSaving(true);
      const themeValue = theme === 'system' ? 'system' : theme;
      settingsStore.updateAppearance({ theme: themeValue });
      setPreference(theme);
      setSaving(false);
    },
    [setPreference, settingsStore]
  );

  const handlePrivacyModeToggle = useCallback(() => {
    setSaving(true);
    const newValue = !privacyMode;
    settingsStore.updatePrivacy({
      trackerProtection: newValue,
      adBlockEnabled: newValue,
      blockThirdPartyCookies: newValue,
      doNotTrack: newValue,
    });
    // Small delay to show saving state
    setTimeout(() => setSaving(false), 200);
  }, [privacyMode, settingsStore]);

  const handlePerformanceModeToggle = useCallback(() => {
    setSaving(true);
    const newValue = !performanceMode;
    settingsStore.updateAppearance({ compactUI: newValue });
    // Apply performance optimizations (SettingsSync will handle this, but apply immediately for responsiveness)
    applyPerformanceMode(newValue);
    // Small delay to show saving state
    setTimeout(() => setSaving(false), 200);
  }, [performanceMode, settingsStore]);

  const handleKeyboardShortcuts = useCallback(() => {
    closeMenu();
    navigate('/settings?tab=shortcuts');
  }, [closeMenu, navigate]);

  const handleOpenFullSettings = useCallback(() => {
    closeMenu();
    navigate('/settings');
  }, [closeMenu, navigate]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Settings menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
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
        <Settings2 className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Settings"
          className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Quick settings</p>
              <p className="text-xs text-[var(--text-muted)]">
                {saving ? 'Saving…' : 'Applies everywhere'}
              </p>
            </div>
            {saving && <span className="text-xs text-[var(--text-muted)]">…</span>}
          </div>

          <div className="space-y-4 px-4 py-4" style={{ fontSize: tokens.fontSize.sm }}>
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                Theme
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'system', label: 'Auto', icon: MonitorCog },
                  { key: 'light', label: 'Light', icon: SunMedium },
                  { key: 'dark', label: 'Dark', icon: Moon },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                      handleThemeChange(key as ThemePreference);
                    }}
                    onMouseDown={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${
                      currentTheme === key
                        ? 'bg-[var(--color-primary-500)]/10 border-[var(--color-primary-500)] text-[var(--text-primary)]'
                        : 'border-[var(--surface-border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)]'
                    }`}
                    style={{ zIndex: 10011, isolation: 'isolate' }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <label className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Privacy mode</p>
                  <p className="text-xs text-[var(--text-muted)]">Block trackers & ads</p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handlePrivacyModeToggle();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    privacyMode ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--surface-border)]'
                  }`}
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      privacyMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Performance boost</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Aggressive cache + reduced effects
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handlePerformanceModeToggle();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    performanceMode ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--surface-border)]'
                  }`}
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      performanceMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </section>

            <section className="space-y-2 border-t border-[var(--surface-border)] pt-3">
              <button
                type="button"
                onClick={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                  handleKeyboardShortcuts();
                }}
                onMouseDown={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                style={{ zIndex: 10011, isolation: 'isolate' }}
              >
                <Keyboard className="h-4 w-4 text-[var(--color-primary-400)]" />
                Keyboard shortcuts
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                onClick={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                  handleOpenFullSettings();
                }}
                onMouseDown={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                }}
                style={{ zIndex: 10011, isolation: 'isolate' }}
              >
                <Settings2 className="h-4 w-4 text-[var(--text-muted)]" />
                Open full settings
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
