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
  Clock
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
    const unsubscribe = service.onStatusUpdate((newStatus) => {
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
    } catch (_error: any) {
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
          <div className={`p-2 rounded-lg ${
            status?.connected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {status?.connected ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldOff className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">VPN</h2>
            <p className="text-sm text-gray-400">
              {status?.connected 
                ? `Connected to ${status.profileName || 'VPN'}` 
                : 'Not connected'}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh status"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
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
                ? 'bg-green-500/10 border-green-500/40'
                : 'bg-gray-900/50 border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {status.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                <span className={`font-medium ${
                  status.connected ? 'text-green-300' : 'text-gray-300'
                }`}>
                  {status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {status.connected && (
                <button
                  onClick={handleDisconnect}
                  disabled={loading || disconnecting}
                  className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                    <Server className="w-4 h-4 text-gray-400" />
                    <span>{status.server}</span>
                  </div>
                )}
                {status.uptime && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Uptime: {formatUptime(status.uptime)}</span>
                  </div>
                )}
                {status.type && (
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs rounded border ${getTypeBadge(status.type)}`}>
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
        <h3 className="text-lg font-medium text-white mb-4">Available Profiles</h3>
        
        {profiles.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No VPN profiles available</p>
            <p className="text-xs mt-1">Add profiles to /config/vpn-profiles.json</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const isActive = status?.connected && status.profileId === profile.id;
              const isConnecting = connecting === profile.id;

              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border p-4 transition-all ${
                    isActive
                      ? 'bg-green-500/10 border-green-500/40'
                      : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{profile.name}</h4>
                        {isActive && (
                          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded">
                            Active
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded border ${getTypeBadge(profile.type)}`}>
                          {profile.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        {profile.server}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <button
                          onClick={handleDisconnect}
                          disabled={loading || disconnecting}
                          className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {disconnecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Disconnect'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(profile.id)}
                          disabled={loading || isConnecting || status?.connected}
                          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4" />
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
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/40 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">VPN Connection Requirements</p>
            <ul className="list-disc list-inside space-y-1 text-blue-200/80">
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

