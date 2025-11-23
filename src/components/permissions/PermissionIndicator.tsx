import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { ipcEvents } from '../../lib/ipc-events';
import { showToast } from '../../state/toastStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { PERMISSION_OPTIONS, type PermissionKey } from './constants';

type SitePermissionEntry = { permission: PermissionKey; origins: string[] };

interface PermissionIndicatorProps {
  containerId?: string | null;
  origin?: string | null;
  onOpenSettings?: () => void;
}

const createEmptySitePermissions = (): Record<PermissionKey, string[]> => ({
  media: [],
  'display-capture': [],
  notifications: [],
  fullscreen: [],
});

export function PermissionIndicator({
  containerId,
  origin,
  onOpenSettings,
}: PermissionIndicatorProps) {
  const [containerPermissions, setContainerPermissions] = useState<PermissionKey[]>([]);
  const [sitePermissions, setSitePermissions] = useState<Record<PermissionKey, string[]>>(() =>
    createEmptySitePermissions()
  );
  const [busyKey, setBusyKey] = useState<PermissionKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadContainerPermissions = useCallback(async () => {
    if (!containerId) {
      setContainerPermissions([]);
      setSitePermissions(createEmptySitePermissions());
      return;
    }
    try {
      const [containerResp, siteResp] = await Promise.all([
        ipc.containers.getPermissions(containerId),
        ipc.containers.getSitePermissions(containerId),
      ]);
      setContainerPermissions(
        Array.isArray(containerResp?.permissions)
          ? (containerResp.permissions as PermissionKey[])
          : []
      );
      if (Array.isArray(siteResp)) {
        const map: Record<PermissionKey, string[]> = createEmptySitePermissions();
        (siteResp as SitePermissionEntry[]).forEach(entry => {
          map[entry.permission] = entry.origins ?? [];
        });
        setSitePermissions(map);
      } else {
        setSitePermissions(createEmptySitePermissions());
        setSitePermissions(createEmptySitePermissions());
      }
    } catch (error) {
      console.error('[PermissionIndicator] Failed to load permissions:', error);
    }
  }, [containerId]);

  useEffect(() => {
    void loadContainerPermissions();
  }, [loadContainerPermissions]);

  useEffect(() => {
    if (!containerId) return;
    const unsubscribe = ipcEvents.on<{
      containerId: string;
      permission: PermissionKey;
      origins: string[];
    }>('containers:sitePermissions', payload => {
      if (payload.containerId !== containerId) return;
      setSitePermissions(prev => ({
        ...prev,
        [payload.permission]: payload.origins ?? [],
      }));
    });
    return () => {
      unsubscribe();
    };
  }, [containerId]);

  const originLabel = useMemo(() => {
    if (!origin) return null;
    return origin.replace(/^https?:\/\//, '');
  }, [origin]);

  const toggleContainerPermission = useCallback(
    async (permission: PermissionKey, enabled: boolean) => {
      if (!containerId) return;
      setBusyKey(permission);
      try {
        const response = await ipc.containers.setPermission(containerId, permission, enabled);
        setContainerPermissions(
          Array.isArray(response?.permissions) ? (response.permissions as PermissionKey[]) : []
        );
        if (!enabled) {
          setSitePermissions(prev => ({
            ...prev,
            [permission]: [],
          }));
        }
      } catch (error) {
        console.error('[PermissionIndicator] Failed to toggle container permission:', error);
        showToast('error', 'Unable to update permission.');
      } finally {
        setBusyKey(null);
      }
    },
    [containerId]
  );

  const toggleSitePermission = useCallback(
    async (permission: PermissionKey, allow: boolean) => {
      if (!containerId || !origin) {
        showToast('info', 'Open a secure site to manage site-specific permissions.');
        return;
      }
      setBusyKey(permission);
      try {
        if (allow) {
          await ipc.containers.allowSitePermission(containerId, permission, origin);
        } else {
          await ipc.containers.revokeSitePermission(containerId, permission, origin);
        }
      } catch (error) {
        console.error('[PermissionIndicator] Failed to toggle site permission:', error);
        showToast('error', 'Unable to update site permission.');
      } finally {
        setBusyKey(null);
        await loadContainerPermissions();
      }
    },
    [containerId, origin, loadContainerPermissions]
  );

  const activePermissions = useMemo(
    () => PERMISSION_OPTIONS.filter(option => containerPermissions.includes(option.key)),
    [containerPermissions]
  );

  if (!containerId) {
    return null;
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
            activePermissions.length > 0
              ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'
              : 'border-gray-800 text-gray-400 bg-gray-900/40'
          }`}
          title="Device & site permissions"
          aria-label="Site permissions"
        >
          <Shield size={14} />
          {activePermissions.length === 0 ? (
            <span>Permissions</span>
          ) : (
            activePermissions.map(perm => {
              const Icon = perm.icon;
              return <Icon key={perm.key} size={14} className="text-current" />;
            })
          )}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="px-3 py-2 text-xs text-gray-400">
          {originLabel
            ? `Active site: ${originLabel}`
            : 'Open a website to manage site-specific controls.'}
        </div>
        <DropdownMenuSeparator />
        {PERMISSION_OPTIONS.map(option => {
          const containerEnabled = containerPermissions.includes(option.key);
          const allowedOrigins = sitePermissions[option.key] ?? [];
          const originAllowed = origin ? allowedOrigins.includes(origin) : false;
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.key}
              className="flex flex-col gap-2 py-3"
              onSelect={event => event.preventDefault()}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg p-2 ${containerEnabled ? 'bg-emerald-500/15 text-emerald-200' : 'bg-gray-800/70 text-gray-400'}`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {option.label}
                    {!containerEnabled && (
                      <span className="text-[11px] text-amber-300">Blocked</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{option.description}</p>
                  {allowedOrigins.length > 0 && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Allowed sites:{' '}
                      {allowedOrigins
                        .slice(0, 3)
                        .map(o => o.replace(/^https?:\/\//, ''))
                        .join(', ')}
                      {allowedOrigins.length > 3 ? ` +${allowedOrigins.length - 3}` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busyKey === option.key}
                  onClick={() => toggleContainerPermission(option.key, !containerEnabled)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    containerEnabled
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  {containerEnabled ? 'Allowed' : 'Blocked'}
                </button>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  disabled={!origin || !containerEnabled || busyKey === option.key}
                  onClick={() => toggleSitePermission(option.key, !originAllowed)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
                    originAllowed
                      ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                      : 'border-gray-800 text-gray-300'
                  } ${!origin || !containerEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500/70'}`}
                >
                  <div className="font-semibold">
                    {originAllowed ? 'Revoke for this site' : 'Allow this site'}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {origin ? originLabel : 'Open a site to manage site access.'}
                  </p>
                </button>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={event => {
            event.preventDefault();
            setMenuOpen(false);
            onOpenSettings?.();
          }}
        >
          Manage in Settings…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
