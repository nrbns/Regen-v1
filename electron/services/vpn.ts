/**
 * VPN Integration Service
 * Detects and monitors OS-level VPN connections (WireGuard, OpenVPN)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { createLogger } from './utils/logger';

const execAsync = promisify(exec);

export interface VPNStatus {
  connected: boolean;
  type?: 'wireguard' | 'openvpn' | 'ikev2' | 'other';
  name?: string;
  interface?: string;
  server?: string;
}

class VPNService extends EventEmitter {
  private status: VPNStatus = { connected: false };
  private checkInterval: NodeJS.Timeout | null = null;
  private logger = createLogger('vpn');

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start monitoring VPN status
   */
  private startMonitoring(): void {
    this.logger.info('Starting VPN monitor');
    this.checkStatus();
    this.checkInterval = setInterval(() => {
      this.checkStatus();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check current VPN status
   */
  async checkStatus(): Promise<VPNStatus> {
    const platform = process.platform;
    let newStatus: VPNStatus = { connected: false };

    try {
      if (platform === 'win32') {
        newStatus = await this.checkWindowsVPN();
      } else if (platform === 'darwin') {
        newStatus = await this.checkMacOSVPN();
      } else if (platform === 'linux') {
        newStatus = await this.checkLinuxVPN();
      }
    } catch (error) {
      this.logger.warn('VPN check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (JSON.stringify(newStatus) !== JSON.stringify(this.status)) {
      this.status = newStatus;
      this.emit('status', this.status);
      this.logger.info('VPN status updated', { status: this.status });
    }

    return this.status;
  }

  /**
   * Check VPN on Windows (PowerShell)
   */
  private async checkWindowsVPN(): Promise<VPNStatus> {
    try {
      // Check for WireGuard
      const wgCmd = 'powershell "Get-NetAdapter | Where-Object {$_.InterfaceDescription -like \'*WireGuard*\' -or $_.Name -like \'*wg*\'}"';
      const { stdout: wgOut } = await execAsync(wgCmd);
      if (wgOut && wgOut.trim()) {
        const lines = wgOut.trim().split('\n');
        const nameMatch = lines.find(l => l.includes('Name'));
        if (nameMatch) {
          return {
            connected: true,
            type: 'wireguard',
            name: 'WireGuard',
            interface: nameMatch.split(/\s+/)[-1],
          };
        }
      }

      // Check for OpenVPN (TAP adapter)
      const tapCmd = 'powershell "Get-NetAdapter | Where-Object {$_.InterfaceDescription -like \'*TAP*\'}"';
      const { stdout: tapOut } = await execAsync(tapCmd);
      if (tapOut && tapOut.trim()) {
        return {
          connected: true,
          type: 'openvpn',
          name: 'OpenVPN',
        };
      }

      // Check for IKEv2 (Windows built-in)
      const ikev2Cmd = 'powershell "Get-VpnConnection | Where-Object {$_.ConnectionStatus -eq \'Connected\'}"';
      const { stdout: ikev2Out } = await execAsync(ikev2Cmd);
      if (ikev2Out && ikev2Out.trim()) {
        const lines = ikev2Out.trim().split('\n');
        const nameMatch = lines.find(l => l.includes('Name'));
        if (nameMatch) {
          return {
            connected: true,
            type: 'ikev2',
            name: nameMatch.split(/\s+/)[0],
          };
        }
      }
    } catch {
      // No VPN detected
    }

    return { connected: false };
  }

  /**
   * Check VPN on macOS (networksetup)
   */
  private async checkMacOSVPN(): Promise<VPNStatus> {
    try {
      // List VPN services
      const { stdout } = await execAsync('networksetup -listnetworkserviceorder');
      const vpnServices = stdout.match(/\(Hardware Port: (.*?), Device: (.*?)\)/g) || [];
      
      for (const service of vpnServices) {
        const nameMatch = service.match(/Hardware Port: (.*?),/);
        if (nameMatch) {
          const serviceName = nameMatch[1].trim();
          
          // Check if connected
          try {
            const { stdout: status } = await execAsync(`scutil --nc status "${serviceName}"`);
            if (status.includes('Connected')) {
              // Detect type from service name
              let type: VPNStatus['type'] = 'other';
              if (serviceName.toLowerCase().includes('wireguard')) type = 'wireguard';
              else if (serviceName.toLowerCase().includes('openvpn')) type = 'openvpn';
              
              return {
                connected: true,
                type,
                name: serviceName,
              };
            }
          } catch {
            // Service not connected
          }
        }
      }
    } catch {
      // No VPN detected
    }

    return { connected: false };
  }

  /**
   * Check VPN on Linux (ip/ifconfig)
   */
  private async checkLinuxVPN(): Promise<VPNStatus> {
    try {
      // Check for WireGuard
      const wgCmd = 'ip link show type wireguard 2>/dev/null || wg show 2>/dev/null';
      try {
        const { stdout } = await execAsync(wgCmd);
        if (stdout && stdout.trim()) {
          const interfaceMatch = stdout.match(/^\d+:\s+(\w+):/);
          return {
            connected: true,
            type: 'wireguard',
            name: 'WireGuard',
            interface: interfaceMatch?.[1],
          };
        }
      } catch {
        // WireGuard not found
      }

      // Check for OpenVPN (tun/tap)
      const tunCmd = 'ip link show | grep -E "tun[0-9]+|tap[0-9]+"';
      try {
        const { stdout } = await execAsync(tunCmd);
        if (stdout && stdout.trim()) {
          const interfaceMatch = stdout.match(/: (\w+):/);
          return {
            connected: true,
            type: 'openvpn',
            name: 'OpenVPN',
            interface: interfaceMatch?.[1],
          };
        }
      } catch {
        // No OpenVPN
      }
    } catch {
      // No VPN detected
    }

    return { connected: false };
  }

  /**
   * Get current VPN status
   */
  getStatus(): VPNStatus {
    return { ...this.status };
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton
let vpnService: VPNService | null = null;

export function getVPNService(): VPNService {
  if (!vpnService) {
    vpnService = new VPNService();
  }
  return vpnService;
}

