/**
 * VPN Service
 * Manages VPN connections with real-time status updates
 */

import type { VPNProfile, VPNStatus, VPNConnectionResult } from './types';
import { ipc } from '../../lib/ipc-typed';
import { isElectronRuntime, isTauriRuntime } from '../../lib/env';

export class VPNService {
  private profiles: VPNProfile[] = [];
  private status: VPNStatus | null = null;
  private statusListeners: Set<(status: VPNStatus) => void> = new Set();
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private readonly STATUS_CHECK_INTERVAL = 2000; // 2 seconds for realtime updates

  /**
   * Initialize VPN service
   */
  async initialize(): Promise<void> {
    await this.loadProfiles();
    this.startStatusMonitoring();
  }

  /**
   * Load VPN profiles from config
   */
  async loadProfiles(): Promise<VPNProfile[]> {
    try {
      const response = await fetch('/config/vpn-profiles.json');
      if (!response.ok) {
        throw new Error(`Failed to load VPN profiles: ${response.statusText}`);
      }
      this.profiles = await response.json();
      return this.profiles;
    } catch (error) {
      console.error('[VPNService] Failed to load profiles:', error);
      // Return empty array if file not found or error
      this.profiles = [];
      return [];
    }
  }

  /**
   * Get all VPN profiles
   */
  getProfiles(): VPNProfile[] {
    return this.profiles;
  }

  /**
   * Get a specific profile by ID
   */
  getProfile(id: string): VPNProfile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  /**
   * Connect to a VPN profile
   */
  async connect(profileId: string): Promise<VPNConnectionResult> {
    const profile = this.getProfile(profileId);
    if (!profile) {
      return {
        success: false,
        error: `VPN profile "${profileId}" not found`,
      };
    }

    try {
      // In Electron/Tauri, use IPC to execute connection command
      if (isElectronRuntime() || isTauriRuntime()) {
        // Use IPC to execute command (if available)
        // For now, we'll use a generic approach that can be extended
        try {
          // Try to execute via system status or command execution
          // This will need to be implemented in the backend
          const result = await (ipc.system as any)?.execCommand?.(profile.connect, {
            timeout: 30000,
          });

          if (result?.success) {
            // Update status immediately
            await this.checkStatus();
            return {
              success: true,
              message: `Connected to ${profile.name}`,
            };
          } else {
            return {
              success: false,
              error: result?.error || `Failed to connect to ${profile.name}`,
            };
          }
        } catch {
          // Fallback: simulate connection for development/testing
          console.warn('[VPNService] execCommand not available, simulating connection');
          this.status = {
            connected: true,
            profileId: profile.id,
            profileName: profile.name,
            type: profile.type,
            server: profile.server,
            connectedAt: Date.now(),
          };
          this.notifyStatusListeners(this.status);
          return {
            success: true,
            message: `Connected to ${profile.name} (simulated)`,
          };
        }
      } else {
        // In web mode, simulate connection (for testing)
        console.warn('[VPNService] VPN connection not available in web mode');
        return {
          success: false,
          error: 'VPN connections require Electron/Tauri runtime',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[VPNService] Connection error:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from VPN
   */
  async disconnect(profileId?: string): Promise<VPNConnectionResult> {
    // If no profile specified, try to get current connected profile
    let profile = profileId ? this.getProfile(profileId) : null;

    if (!profile && this.status?.profileId) {
      profile = this.getProfile(this.status.profileId);
    }

    if (!profile) {
      // Try to disconnect any active VPN
      try {
        if (isElectronRuntime() || isTauriRuntime()) {
          // Generic disconnect - kill all VPN processes
          const result = await (ipc.system as any)?.execCommand?.('pkill -f "wg-quick|openvpn"', {
            timeout: 10000,
          });

          if (result?.success) {
            await this.checkStatus();
            return {
              success: true,
              message: 'Disconnected from VPN',
            };
          }
        }

        return {
          success: false,
          error: 'No active VPN connection to disconnect',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to disconnect',
        };
      }
    }

    try {
      if (isElectronRuntime() || isTauriRuntime()) {
        const result = await (ipc.system as any)?.execCommand?.(profile.disconnect, {
          timeout: 10000,
        });

        if (result?.success) {
          await this.checkStatus();
          return {
            success: true,
            message: `Disconnected from ${profile.name}`,
          };
        } else {
          return {
            success: false,
            error: result?.error || `Failed to disconnect from ${profile.name}`,
          };
        }
      } else {
        return {
          success: false,
          error: 'VPN disconnection requires Electron/Tauri runtime',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check VPN status
   */
  async checkStatus(): Promise<VPNStatus> {
    try {
      // Try to get status from system status API
      if (isElectronRuntime() || isTauriRuntime()) {
        const systemStatus = await ipc.system.getStatus();

        if (systemStatus?.vpn) {
          const vpnStatus = systemStatus.vpn;

          // Find matching profile if connected
          let profile: VPNProfile | undefined;
          if (vpnStatus.profile) {
            profile = this.profiles.find(
              p => p.id === vpnStatus.profile || p.name === vpnStatus.profile
            );
          }

          this.status = {
            connected: vpnStatus.connected || false,
            profileId: profile?.id,
            profileName: profile?.name,
            type: vpnStatus.type as any,
            server: profile?.server,
            connectedAt: this.status?.connectedAt || (vpnStatus.connected ? Date.now() : undefined),
            uptime:
              vpnStatus.connected && this.status?.connectedAt
                ? Date.now() - this.status.connectedAt
                : undefined,
          };

          // Notify listeners
          this.notifyStatusListeners(this.status);
          return this.status;
        }
      }

      // Fallback: Check manually by running status commands
      const connectedProfile = this.profiles.find(async profile => {
        if (!profile.status) return false;

        try {
          if (isElectronRuntime() || isTauriRuntime()) {
            const result = await (ipc.system as any)?.execCommand?.(profile.status, {
              timeout: 5000,
            });
            return result?.success && result?.output && result.output.trim().length > 0;
          }
        } catch {
          return false;
        }
        return false;
      });

      if (connectedProfile) {
        this.status = {
          connected: true,
          profileId: connectedProfile.id,
          profileName: connectedProfile.name,
          type: connectedProfile.type,
          server: connectedProfile.server,
          connectedAt: this.status?.connectedAt || Date.now(),
          uptime: this.status?.connectedAt ? Date.now() - this.status.connectedAt : undefined,
        };
      } else {
        this.status = {
          connected: false,
        };
      }

      this.notifyStatusListeners(this.status);
      return this.status;
    } catch (error) {
      console.error('[VPNService] Status check error:', error);
      this.status = {
        connected: false,
      };
      this.notifyStatusListeners(this.status);
      return this.status;
    }
  }

  /**
   * Get current status (synchronous)
   */
  getStatus(): VPNStatus | null {
    return this.status;
  }

  /**
   * Start realtime status monitoring
   */
  startStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      return; // Already monitoring
    }

    // Initial check
    this.checkStatus();

    // Check every 2 seconds for realtime updates
    this.statusCheckInterval = setInterval(() => {
      this.checkStatus().catch(error => {
        console.error('[VPNService] Status check failed:', error);
      });
    }, this.STATUS_CHECK_INTERVAL);
  }

  /**
   * Stop status monitoring
   */
  stopStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Subscribe to status updates
   */
  onStatusUpdate(callback: (status: VPNStatus) => void): () => void {
    this.statusListeners.add(callback);

    // Immediately call with current status if available
    if (this.status) {
      callback(this.status);
    }

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(status: VPNStatus): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[VPNService] Error in status listener:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopStatusMonitoring();
    this.statusListeners.clear();
  }
}

// Singleton instance
let vpnServiceInstance: VPNService | null = null;

export function getVPNService(): VPNService {
  if (!vpnServiceInstance) {
    vpnServiceInstance = new VPNService();
    vpnServiceInstance.initialize().catch(error => {
      console.error('[VPNService] Initialization error:', error);
    });
  }
  return vpnServiceInstance;
}
