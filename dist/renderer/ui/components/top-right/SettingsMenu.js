import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings2, Moon, SunMedium, MonitorCog, Keyboard } from 'lucide-react';
import { useTheme } from '../../theme';
import { useTokens } from '../../useTokens';
import { useSettingsStore } from '../../../state/settingsStore';
import { applyPerformanceMode } from '../../../utils/performanceMode';
import { ipc } from '../../../lib/ipc-typed';
export function SettingsMenu() {
    const tokens = useTokens();
    const { setPreference, preference } = useTheme();
    const settingsStore = useSettingsStore();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    // Get current settings from centralized store
    // Sync theme from settingsStore to themeStore on mount
    useEffect(() => {
        const settingsTheme = settingsStore.appearance.theme;
        if (settingsTheme && settingsTheme !== preference) {
            setPreference(settingsTheme);
        }
    }, [preference, setPreference, settingsStore.appearance.theme]); // Sync when theme changes
    // Use themeStore preference as source of truth for UI, but sync with settingsStore
    const currentTheme = preference;
    const privacyMode = settingsStore.privacy.trackerProtection && settingsStore.privacy.adBlockEnabled;
    const performanceMode = settingsStore.appearance.compactUI; // Using compactUI as a proxy for performance mode
    const closeMenu = useCallback(() => {
        setOpen(false);
        triggerRef.current?.focus();
    }, []);
    useEffect(() => {
        if (!open)
            return;
        function handlePointer(event) {
            const target = event.target;
            if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
                closeMenu();
            }
        }
        window.addEventListener('pointerdown', handlePointer);
        return () => window.removeEventListener('pointerdown', handlePointer);
    }, [closeMenu, open]);
    useEffect(() => {
        if (!open)
            return;
        function handleKey(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [closeMenu, open]);
    const handleThemeChange = useCallback((theme) => {
        setSaving(true);
        const themeValue = theme === 'system' ? 'system' : theme;
        // Update both stores to keep them in sync
        settingsStore.updateAppearance({ theme: themeValue });
        setPreference(theme);
        // Small delay to show saving state
        setTimeout(() => setSaving(false), 200);
    }, [setPreference, settingsStore]);
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
    const handleKeyboardShortcuts = useCallback(async () => {
        closeMenu();
        // Open settings in a new tab with shortcuts tab selected
        try {
            const newTab = await ipc.tabs.create({
                url: 'regen://internal/settings?tab=shortcuts',
                appMode: 'Browse',
                activate: true,
            });
            if (!newTab || !('id' in newTab) || !newTab.id) {
                // Fallback to navigation if tab creation fails
                window.location.href = '/settings?tab=shortcuts';
            }
        }
        catch (error) {
            console.error('[SettingsMenu] Failed to open shortcuts in new tab:', error);
            // Fallback to navigation if tab creation fails
            window.location.href = '/settings?tab=shortcuts';
        }
    }, [closeMenu]);
    const handleOpenFullSettings = useCallback(async () => {
        closeMenu();
        // Open settings in a new tab
        try {
            const newTab = await ipc.tabs.create({
                url: 'regen://internal/settings',
                appMode: 'Browse',
                activate: true,
            });
            if (!newTab || !('id' in newTab) || !newTab.id) {
                // Fallback to navigation if tab creation fails
                window.location.href = '/settings';
            }
        }
        catch (error) {
            console.error('[SettingsMenu] Failed to open settings in new tab:', error);
            // Fallback to navigation if tab creation fails
            window.location.href = '/settings';
        }
    }, [closeMenu]);
    return (_jsxs("div", { className: "relative", children: [_jsx("button", { ref: triggerRef, type: "button", "aria-label": "Settings menu", "aria-haspopup": "menu", "aria-expanded": open, className: "rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2", onClick: e => {
                    e.stopPropagation();
                    if (e.nativeEvent?.stopImmediatePropagation) {
                        e.nativeEvent.stopImmediatePropagation();
                    }
                    setOpen(value => !value);
                }, onMouseDown: e => {
                    e.stopPropagation();
                    if (e.nativeEvent?.stopImmediatePropagation) {
                        e.nativeEvent.stopImmediatePropagation();
                    }
                }, children: _jsx(Settings2, { className: "h-5 w-5", "aria-hidden": true }) }), open && (_jsxs("div", { ref: panelRef, role: "menu", "aria-label": "Settings", className: "absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-[var(--text-primary)]", children: "Quick settings" }), _jsx("p", { className: "text-xs text-[var(--text-muted)]", children: saving ? 'Saving…' : 'Applies everywhere' })] }), saving && _jsx("span", { className: "text-xs text-[var(--text-muted)]", children: "\u2026" })] }), _jsxs("div", { className: "space-y-4 px-4 py-4", style: { fontSize: tokens.fontSize.sm }, children: [_jsxs("section", { children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]", children: "Theme" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: [
                                            { key: 'system', label: 'Auto', icon: MonitorCog },
                                            { key: 'light', label: 'Light', icon: SunMedium },
                                            { key: 'dark', label: 'Dark', icon: Moon },
                                        ].map(({ key, label, icon: Icon }) => (_jsxs("button", { type: "button", onClick: e => {
                                                e.stopPropagation();
                                                if (e.nativeEvent?.stopImmediatePropagation) {
                                                    e.nativeEvent.stopImmediatePropagation();
                                                }
                                                handleThemeChange(key);
                                            }, onMouseDown: e => {
                                                e.stopPropagation();
                                                if (e.nativeEvent?.stopImmediatePropagation) {
                                                    e.nativeEvent.stopImmediatePropagation();
                                                }
                                            }, className: `flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${currentTheme === key
                                                ? 'bg-[var(--color-primary-500)]/10 border-[var(--color-primary-500)] text-[var(--text-primary)]'
                                                : 'border-[var(--surface-border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)]'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(Icon, { className: "h-4 w-4" }), label] }, key))) })] }), _jsxs("section", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-[var(--text-primary)]", children: "Privacy mode" }), _jsx("p", { className: "text-xs text-[var(--text-muted)]", children: "Block trackers & ads" })] }), _jsx("button", { type: "button", onClick: e => {
                                                    e.stopPropagation();
                                                    if (e.nativeEvent?.stopImmediatePropagation) {
                                                        e.nativeEvent.stopImmediatePropagation();
                                                    }
                                                    handlePrivacyModeToggle();
                                                }, onMouseDown: e => {
                                                    e.stopPropagation();
                                                    if (e.nativeEvent?.stopImmediatePropagation) {
                                                        e.nativeEvent.stopImmediatePropagation();
                                                    }
                                                }, className: `relative inline-flex h-6 w-11 items-center rounded-full transition ${privacyMode ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--surface-border)]'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white transition ${privacyMode ? 'translate-x-5' : 'translate-x-1'}` }) })] }), _jsxs("label", { className: "flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-[var(--text-primary)]", children: "Performance boost" }), _jsx("p", { className: "text-xs text-[var(--text-muted)]", children: "Aggressive cache + reduced effects" })] }), _jsx("button", { type: "button", onClick: e => {
                                                    e.stopPropagation();
                                                    if (e.nativeEvent?.stopImmediatePropagation) {
                                                        e.nativeEvent.stopImmediatePropagation();
                                                    }
                                                    handlePerformanceModeToggle();
                                                }, onMouseDown: e => {
                                                    e.stopPropagation();
                                                    if (e.nativeEvent?.stopImmediatePropagation) {
                                                        e.nativeEvent.stopImmediatePropagation();
                                                    }
                                                }, className: `relative inline-flex h-6 w-11 items-center rounded-full transition ${performanceMode ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--surface-border)]'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: _jsx("span", { className: `inline-block h-5 w-5 transform rounded-full bg-white transition ${performanceMode ? 'translate-x-5' : 'translate-x-1'}` }) })] })] }), _jsxs("section", { className: "space-y-2 border-t border-[var(--surface-border)] pt-3", children: [_jsxs("button", { type: "button", onClick: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                            handleKeyboardShortcuts();
                                        }, onMouseDown: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                        }, className: "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]", style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(Keyboard, { className: "h-4 w-4 text-[var(--color-primary-400)]" }), "Keyboard shortcuts"] }), _jsxs("button", { type: "button", className: "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]", onClick: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                            handleOpenFullSettings();
                                        }, onMouseDown: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                        }, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(Settings2, { className: "h-4 w-4 text-[var(--text-muted)]" }), "Open full settings"] })] })] })] }))] }));
}
