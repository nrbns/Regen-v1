/**
 * VPN Panel Component
 * Real-time VPN connection management UI
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Clock,
} from 'lucide-react';
import { getVPNService, type VPNProfile, type VPNStatus } from '../../services/vpn';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';
import { motion, AnimatePresence } from 'framer-motion';

export function VPNPanel() {
  const { isMobile } = useMobileDetection();
  const [profiles, setProfiles] = useState<VPNProfile[]>([]);
  const [status, setStatus] = useState<VPNStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const service = getVPNService();

    // Load profiles
    service.loadProfiles().then(loadedProfiles => {
      setProfiles(loadedProfiles);
    });

    // Subscribe to realtime status updates
    const unsubscribe = service.onStatusUpdate(newStatus => {
      setStatus(newStatus);
    });

    // Initial status check
    service.checkStatus().then(currentStatus => {
      setStatus(currentStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleConnect = async (profileId: string) => {
    setConnecting(profileId);
    setLoading(true);

    try {
      const service = getVPNService();
      const result = await service.connect(profileId);

      if (result.success) {
        toast.success(result.message || `Connected to VPN`);
        // Status will be updated automatically via subscription
        await service.checkStatus();
      } else {
        toast.error(result.error || 'Failed to connect to VPN');
      }
    } catch (error: any) {
      toast.error(error.message || 'Connection failed');
    } finally {
      setLoading(false);
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!status?.connected) return;

    setDisconnecting(true);
    setLoading(true);

    try {
      const service = getVPNService();
      const result = await service.disconnect(status.profileId);

      if (result.success) {
        toast.success(result.message || 'Disconnected from VPN');
        await service.checkStatus();
      } else {
        toast.error(result.error || 'Failed to disconnect');
      }
    } catch (error: any) {
      toast.error(error.message || 'Disconnection failed');
    } finally {
      setLoading(false);
      setDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const service = getVPNService();
      await service.checkStatus();
      toast.success('Status refreshed');
    } catch {
      toast.error('Failed to refresh status');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (ms?: number): string => {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      wireguard: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      openvpn: 'bg-green-500/20 text-green-300 border-green-500/40',
      other: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              status?.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {status?.connected ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldOff className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">VPN</h2>
            <p className="text-sm text-gray-400">
              {status?.connected ? `Connected to ${status.profileName || 'VPN'}` : 'Not connected'}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg bg-gray-800 p-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh status"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Card */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg border p-4 ${
              status.connected
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-gray-700 bg-gray-900/50'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span
                  className={`font-medium ${status.connected ? 'text-green-300' : 'text-gray-300'}`}
                >
                  {status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {status.connected && (
                <button
                  onClick={handleDisconnect}
                  disabled={loading || disconnecting}
                  className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </button>
              )}
            </div>

            {status.connected && (
              <div className="space-y-2 text-sm">
                {status.server && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Server className="h-4 w-4 text-gray-400" />
                    <span>{status.server}</span>
                  </div>
                )}
                {status.uptime && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Uptime: {formatUptime(status.uptime)}</span>
                  </div>
                )}
                {status.type && (
                  <div className="mt-2">
                    <span
                      className={`rounded border px-2 py-1 text-xs ${getTypeBadge(status.type)}`}
                    >
                      {status.type.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profiles List */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-white">Available Profiles</h3>

        {profiles.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Shield className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No VPN profiles available</p>
            <p className="mt-1 text-xs">Add profiles to /config/vpn-profiles.json</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map(profile => {
              const isActive = status?.connected && status.profileId === profile.id;
              const isConnecting = connecting === profile.id;

              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border p-4 transition-all ${
                    isActive
                      ? 'border-green-500/40 bg-green-500/10'
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="font-medium text-white">{profile.name}</h4>
                        {isActive && (
                          <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                            Active
                          </span>
                        )}
                        <span
                          className={`rounded border px-2 py-0.5 text-xs ${getTypeBadge(profile.type)}`}
                        >
                          {profile.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="flex items-center gap-1 text-sm text-gray-400">
                        <Server className="h-3 w-3" />
                        {profile.server}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <button
                          onClick={handleDisconnect}
                          disabled={loading || disconnecting}
                          className="rounded-lg bg-red-600/20 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {disconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Disconnect'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(profile.id)}
                          disabled={loading || isConnecting || status?.connected}
                          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              Connect
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Alert */}
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="text-sm text-blue-300">
            <p className="mb-1 font-medium">VPN Connection Requirements</p>
            <ul className="list-inside list-disc space-y-1 text-blue-200/80">
              <li>VPN functionality requires Electron or Tauri runtime</li>
              <li>Ensure VPN client software is installed (WireGuard/OpenVPN)</li>
              <li>Profile configuration files must be accessible to the system</li>
              <li>Status updates refresh every 2 seconds automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
