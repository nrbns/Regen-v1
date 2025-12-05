import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, LogOut, RefreshCw, User } from 'lucide-react';
import { isWebMode } from '../../../lib/env';
const presenceColors = {
    online: 'bg-emerald-400',
    away: 'bg-amber-400',
    busy: 'bg-rose-400',
    offline: 'bg-gray-500',
};
export function ProfileMenu() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [syncStatus, setSyncStatus] = useState('ready');
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const closeMenu = useCallback(() => {
        setOpen(false);
        triggerRef.current?.focus();
    }, []);
    useEffect(() => {
        async function fetchProfile() {
            // In web mode, use mock profile
            if (isWebMode()) {
                setProfile({
                    id: 'web-user',
                    name: 'Web User',
                    email: 'user@example.com',
                    avatarUrl: undefined,
                    presence: 'online',
                    syncStatus: 'ready',
                    orgs: [],
                    activeOrgId: undefined,
                });
                setSyncStatus('ready');
                setLoading(false);
                return;
            }
            try {
                const res = await fetch('/api/profile');
                if (!res.ok)
                    throw new Error('Failed to load profile');
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // Got HTML instead of JSON - backend not available
                    setProfile({
                        id: 'local-user',
                        name: 'Local User',
                        email: 'local@example.com',
                        avatarUrl: undefined,
                        presence: 'offline',
                        syncStatus: 'error',
                        orgs: [],
                        activeOrgId: undefined,
                    });
                    setSyncStatus('error');
                    setLoading(false);
                    return;
                }
                const data = (await res.json());
                setProfile(data.user);
                if (data.syncStatus)
                    setSyncStatus(data.syncStatus);
            }
            catch (error) {
                // Suppress errors in web mode
                if (!isWebMode()) {
                    console.error('[ProfileMenu] Failed to load profile', error);
                }
                setSyncStatus('error');
                // Set a fallback profile
                setProfile({
                    id: 'local-user',
                    name: 'Local User',
                    email: 'local@example.com',
                    avatarUrl: undefined,
                    presence: 'offline',
                    syncStatus: 'error',
                    orgs: [],
                    activeOrgId: undefined,
                });
            }
            finally {
                setLoading(false);
            }
        }
        void fetchProfile();
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
    const handleOrgSwitch = useCallback(async (orgId) => {
        if (!profile)
            return;
        setProfile({ ...profile, activeOrgId: orgId });
        try {
            await fetch('/api/profile/switch-org', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId }),
            });
        }
        catch (error) {
            console.error('[ProfileMenu] Failed to switch organization', error);
        }
    }, [profile]);
    const handleSignOut = useCallback(async () => {
        try {
            await fetch('/api/profile/signout', { method: 'POST' });
            closeMenu();
            window.location.href = '/logout';
        }
        catch (error) {
            console.error('[ProfileMenu] Sign-out failed', error);
        }
    }, [closeMenu]);
    if (loading && !profile) {
        return (_jsx("div", { className: "rounded-full bg-[var(--surface-elevated)] p-2 text-[var(--text-muted)]", children: _jsx(Loader2, { className: "h-5 w-5 animate-spin", "aria-label": "Loading profile" }) }));
    }
    const presenceClass = profile?.presence
        ? (presenceColors[profile.presence] ?? presenceColors.offline)
        : presenceColors.offline;
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { ref: triggerRef, type: "button", "aria-label": "Account menu", "aria-haspopup": "menu", "aria-expanded": open, className: "flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-2 py-1 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--surface-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2", onClick: e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    setOpen(value => !value);
                }, onMouseDown: e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                }, children: [_jsxs("div", { className: "relative", children: [profile?.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: "", className: "h-8 w-8 rounded-full object-cover" })) : (_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text-secondary)]", children: profile?.name?.slice(0, 1) ?? '?' })), _jsx("span", { className: `absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[var(--surface-elevated)] ${presenceClass}` })] }), _jsxs("div", { className: "hidden flex-col text-left sm:flex", children: [_jsx("span", { className: "text-xs font-semibold", children: profile?.name }), _jsx("span", { className: "text-[0.65rem] text-[var(--text-muted)]", children: profile?.activeOrgId
                                    ? `Org: ${profile?.orgs?.find(org => org.id === profile.activeOrgId)?.name ?? '—'}`
                                    : 'Personal' })] }), _jsx(ChevronDown, { className: "h-4 w-4 text-[var(--text-muted)]", "aria-hidden": true })] }), open && (_jsxs("div", { ref: panelRef, role: "menu", "aria-label": "Account", className: "absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-2xl", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-[var(--surface-border)] px-4 py-4", children: [profile?.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: profile.name, className: "h-12 w-12 rounded-full object-cover" })) : (_jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)] text-lg font-semibold text-[var(--text-secondary)]", children: profile?.name?.slice(0, 1) ?? '?' })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold text-[var(--text-primary)]", children: profile?.name }), _jsx("p", { className: "truncate text-xs text-[var(--text-muted)]", children: profile?.email }), _jsxs("p", { className: "mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]", children: [syncStatus === 'syncing' && _jsx(RefreshCw, { className: "h-3 w-3 animate-spin" }), syncStatus === 'error' && _jsx("span", { className: "text-rose-400", children: "Sync issue" }), syncStatus === 'ready' && (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-3 w-3 text-emerald-400" }), "Synced"] }))] })] })] }), _jsxs("div", { className: "px-4 py-3", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]", children: "Organizations" }), _jsxs("div", { className: "space-y-2", children: [(profile?.orgs ?? []).map(org => {
                                        const active = profile?.activeOrgId === org.id;
                                        return (_jsxs("button", { type: "button", className: `flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${active
                                                ? 'bg-[var(--color-primary-500)]/10 border-[var(--color-primary-500)] text-[var(--text-primary)]'
                                                : 'border-[var(--surface-border)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)]'}`, onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleOrgSwitch(org.id);
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, style: { zIndex: 10011, isolation: 'isolate' }, children: [org.name, active && _jsx(CheckCircle2, { className: "h-4 w-4 text-[var(--color-primary-400)]" })] }, org.id));
                                    }), (!profile?.orgs || profile.orgs.length === 0) && (_jsx("div", { className: "rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-center text-xs text-[var(--text-muted)]", children: "No organizations linked." }))] })] }), _jsxs("div", { className: "space-y-1 border-t border-[var(--surface-border)] px-3 py-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]", onClick: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('app:open-profile'));
                                }, onMouseDown: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                }, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(User, { className: "h-4 w-4 text-[var(--text-muted)]" }), "View profile"] }), _jsxs("button", { type: "button", className: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-500/10", onClick: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                    void handleSignOut();
                                }, onMouseDown: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                }, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(LogOut, { className: "h-4 w-4" }), "Sign out"] })] })] }))] }));
}
