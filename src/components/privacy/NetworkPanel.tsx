/**
 * Network Panel - Tor, VPN, and network controls
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, RefreshCw, Power, Globe } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

export function NetworkPanel() {
  const [torStatus, setTorStatus] = useState<any>(null);
  const [vpnStatus, setVpnStatus] = useState<any>(null);
  const [dohStatus, setDohStatus] = useState<any>(null);
  const [networkControls, setNetworkControls] = useState<any>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [tor, vpn, dns, network] = await Promise.all([
          ipc.tor.status(),
          ipc.vpn.status(),
          ipc.dns.status(),
          ipc.network.get(),
        ]);
        setTorStatus(tor);
        setVpnStatus(vpn);
        setDohStatus(dns);
        setNetworkControls(network);
      } catch (error) {
        console.error('Failed to load network status:', error);
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTorStart = async () => {
    try {
      await ipc.tor.start();
      setTimeout(() => {
        ipc.tor.status().then(setTorStatus);
      }, 1000);
    } catch (error) {
      console.error('Failed to start Tor:', error);
    }
  };

  const handleTorStop = async () => {
    try {
      await ipc.tor.stop();
      setTorStatus({ running: false, bootstrapped: false, progress: 0, circuitEstablished: false });
    } catch (error) {
      console.error('Failed to stop Tor:', error);
    }
  };

  const handleNewIdentity = async () => {
    try {
      await ipc.tor.newIdentity();
      setTimeout(() => {
        ipc.tor.status().then(setTorStatus);
      }, 500);
    } catch (error) {
      console.error('Failed to renew identity:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tor Network */}
      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded bg-orange-500/20 text-orange-400 flex-shrink-0">
            <Network size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-200 mb-1">Tor Network</h3>
            <p className="text-sm text-gray-400">Route traffic through Tor network for enhanced anonymity</p>
          </div>
        </div>

        {torStatus?.running ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Status</span>
              <span className={`font-medium ${torStatus.bootstrapped ? 'text-green-400' : 'text-yellow-400'}`}>
                {torStatus.bootstrapped ? 'Connected' : `Bootstrap ${torStatus.progress}%`}
              </span>
            </div>
            {torStatus.error && (
              <div className="text-xs text-red-400">{torStatus.error}</div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleTorStop}
                className="flex-1 px-4 py-2.5 bg-red-600/60 hover:bg-red-600/80 rounded-lg border border-red-500/30 text-red-200 text-sm font-medium transition-colors"
              >
                Stop Tor
              </button>
              <button
                onClick={handleNewIdentity}
                className="px-4 py-2.5 bg-orange-600/60 hover:bg-orange-600/80 rounded-lg border border-orange-500/30 text-orange-200 text-sm font-medium transition-colors"
              >
                <RefreshCw size={14} className="inline mr-2" />
                New Identity
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleTorStart}
            className="w-full px-4 py-3 bg-orange-600/60 hover:bg-orange-600/80 rounded-lg border border-orange-500/30 text-orange-200 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Power size={18} />
            Start Tor
          </button>
        )}
      </div>

      {/* VPN Status */}
      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded bg-blue-500/20 text-blue-400 flex-shrink-0">
            <Network size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-200 mb-1">VPN Status</h3>
            {vpnStatus?.connected ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">VPN</span>
                  <span className="text-green-400 font-medium">
                    {vpnStatus.name || vpnStatus.type || 'Connected'}
                  </span>
                </div>
                {vpnStatus.type && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Type</span>
                    <span className="text-gray-300 capitalize">{vpnStatus.type}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No VPN detected. Connect to a VPN service (WireGuard, OpenVPN, etc.)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DNS-over-HTTPS */}
      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">
            <Globe size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-200 mb-1">DNS-over-HTTPS</h3>
            <p className="text-sm text-gray-400">Use encrypted DNS to prevent DNS leaks</p>
          </div>
        </div>
        {dohStatus?.enabled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Provider</span>
              <span className="text-purple-400 font-medium capitalize">
                {dohStatus.provider || 'cloudflare'}
              </span>
            </div>
            <button
              onClick={async () => {
                await ipc.dns.disableDoH();
                const status = await ipc.dns.status();
                setDohStatus(status);
              }}
              className="w-full mt-2 px-4 py-2.5 bg-gray-700/60 hover:bg-gray-700/80 rounded-lg border border-gray-600/30 text-gray-300 text-sm font-medium transition-colors"
            >
              Disable DoH
            </button>
          </div>
        ) : (
          <button
            onClick={async () => {
              await ipc.dns.enableDoH('cloudflare');
              const status = await ipc.dns.status();
              setDohStatus(status);
            }}
            className="w-full px-4 py-3 bg-purple-600/60 hover:bg-purple-600/80 rounded-lg border border-purple-500/30 text-purple-200 font-medium transition-colors"
          >
            Enable DoH
          </button>
        )}
      </div>

      {/* HTTP/3 QUIC */}
      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded bg-cyan-500/20 text-cyan-400 flex-shrink-0">
              <Network size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-200 mb-1">HTTP/3 QUIC</h3>
            </div>
          </div>
          <motion.button
            onClick={async () => {
              if (networkControls?.quicEnabled) {
                await ipc.network.disableQUIC();
              } else {
                await ipc.network.enableQUIC();
              }
              const config = await ipc.network.get();
              setNetworkControls(config);
            }}
            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
              networkControls?.quicEnabled ? 'bg-green-500' : 'bg-red-500'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: networkControls?.quicEnabled ? 28 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-11">
          {networkControls?.quicEnabled ? 'QUIC enabled' : 'QUIC disabled - Using HTTP/2'}
        </p>
      </div>
    </div>
  );
}

