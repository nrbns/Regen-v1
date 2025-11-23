import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, LogOut, RefreshCw, User } from 'lucide-react';

import type { UserProfile } from './types';

const presenceColors: Record<string, string> = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  busy: 'bg-rose-400',
  offline: 'bg-gray-500',
};

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<'ready' | 'syncing' | 'error'>('ready');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = (await res.json()) as {
          user: UserProfile;
          syncStatus?: UserProfile['syncStatus'];
        };
        setProfile(data.user);
        if (data.syncStatus) setSyncStatus(data.syncStatus);
      } catch (error) {
        console.error('[ProfileMenu] Failed to load profile', error);
        setSyncStatus('error');
      } finally {
        setLoading(false);
      }
    }
    void fetchProfile();
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

  const handleOrgSwitch = useCallback(
    async (orgId: string) => {
      if (!profile) return;
      setProfile({ ...profile, activeOrgId: orgId });
      try {
        await fetch('/api/profile/switch-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId }),
        });
      } catch (error) {
        console.error('[ProfileMenu] Failed to switch organization', error);
      }
    },
    [profile]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/profile/signout', { method: 'POST' });
      closeMenu();
      window.location.href = '/logout';
    } catch (error) {
      console.error('[ProfileMenu] Sign-out failed', error);
    }
  }, [closeMenu]);

  if (loading && !profile) {
    return (
      <div className="rounded-full bg-[var(--surface-elevated)] p-2 text-[var(--text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading profile" />
      </div>
    );
  }

  const presenceClass = profile?.presence
    ? (presenceColors[profile.presence] ?? presenceColors.offline)
    : presenceColors.offline;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-2 py-1 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--surface-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]"
        onClick={e => {
          (e as any).stopImmediatePropagation();
          e.stopPropagation();
          setOpen(value => !value);
        }}
        onMouseDown={e => {
          (e as any).stopImmediatePropagation();
          e.stopPropagation();
        }}
      >
        <div className="relative">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text-secondary)]">
              {profile?.name?.slice(0, 1) ?? '?'}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[var(--surface-elevated)] ${presenceClass}`}
          />
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold">{profile?.name}</span>
          <span className="text-[0.65rem] text-[var(--text-muted)]">
            {profile?.activeOrgId
              ? `Org: ${profile?.orgs?.find(org => org.id === profile.activeOrgId)?.name ?? '—'}`
              : 'Personal'}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-[var(--surface-border)] px-4 py-4">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)] text-lg font-semibold text-[var(--text-secondary)]">
                {profile?.name?.slice(0, 1) ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {profile?.name}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">{profile?.email}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {syncStatus === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}
                {syncStatus === 'error' && <span className="text-rose-400">Sync issue</span>}
                {syncStatus === 'ready' && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Synced
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Organizations
            </p>
            <div className="space-y-2">
              {(profile?.orgs ?? []).map(org => {
                const active = profile?.activeOrgId === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      active
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 text-[var(--text-primary)]'
                        : 'border-[var(--surface-border)] text-[var(--text-secondary)] hover:border-[var(--surface-border-strong)]'
                    }`}
                    onClick={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                      handleOrgSwitch(org.id);
                    }}
                    onMouseDown={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                    }}
                    style={{ zIndex: 10011, isolation: 'isolate' }}
                  >
                    {org.name}
                    {active && <CheckCircle2 className="h-4 w-4 text-[var(--color-primary-400)]" />}
                  </button>
                );
              })}
              {(!profile?.orgs || profile.orgs.length === 0) && (
                <div className="rounded-xl border border-dashed border-[var(--surface-border)] px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                  No organizations linked.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1 border-t border-[var(--surface-border)] px-3 py-3">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
              onClick={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('app:open-profile'));
              }}
              onMouseDown={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
              }}
              style={{ zIndex: 10011, isolation: 'isolate' }}
            >
              <User className="h-4 w-4 text-[var(--text-muted)]" />
              View profile
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-500/10"
              onClick={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
                void handleSignOut();
              }}
              onMouseDown={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
              }}
              style={{ zIndex: 10011, isolation: 'isolate' }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
