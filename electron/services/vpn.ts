/**
 * VPN Integration Service
 * Detects and monitors OS-level VPN connections (WireGuard, OpenVPN)
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { createLogger } from './utils/logger';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface VPNStatus {
  connected: boolean;
  type?: 'wireguard' | 'openvpn' | 'ikev2' | 'other';
  name?: string;
  interface?: string;
  server?: string;
}

export interface VPNProfile {
  id: string;
  name: string;
  type?: 'wireguard' | 'openvpn' | 'ikev2' | 'other';
  connect: string;
  disconnect?: string;
  status?: string;
  server?: string;
}

class VPNService extends EventEmitter {
  private status: VPNStatus = { connected: false };
  private checkInterval: NodeJS.Timeout | null = null;
  private logger = createLogger('vpn');
  private profiles: VPNProfile[] = [];
  private activeProfile: VPNProfile | null = null;
  private configPath: string | null = null;

  constructor() {
    super();
    this.loadProfiles();
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

  private loadProfiles(): void {
    const searchPaths: string[] = [];
    if (process.env.OB_VPN_CONFIG) {
      searchPaths.push(process.env.OB_VPN_CONFIG);
    }
    if (process.resourcesPath) {
      searchPaths.push(path.join(process.resourcesPath, 'config', 'vpn-profiles.json'));
    }
    searchPaths.push(path.join(process.cwd(), 'config', 'vpn-profiles.json'));

    for (const candidate of searchPaths) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const raw = fs.readFileSync(candidate, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.profiles = parsed as VPNProfile[];
          this.configPath = candidate;
          this.logger.info('Loaded VPN profiles', { path: candidate, count: this.profiles.length });
          return;
        }
      } catch (error) {
        this.logger.warn('Failed to load VPN profiles', {
          path: candidate,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Default stub profile set
    this.profiles = [
      {
        id: 'stub-wg',
        name: 'WireGuard (stub)',
        type: 'wireguard',
        connect: process.platform === 'win32' ? 'powershell "Write-Host \'Connecting WireGuard (stub)\'"' : 'echo "Connecting WireGuard (stub)"',
        disconnect: process.platform === 'win32' ? 'powershell "Write-Host \'Disconnect WireGuard (stub)\'"' : 'echo "Disconnect WireGuard (stub)"',
        server: 'stub.local',
      },
    ];
    this.logger.warn('Using stub VPN profiles; provide config at config/vpn-profiles.json');
  }

  listProfiles(): VPNProfile[] {
    return this.profiles;
  }

  async connectProfile(profileId: string): Promise<VPNStatus> {
    const profile = this.profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`VPN profile "${profileId}" not found`);
    }

    this.logger.info('Connecting VPN profile', { id: profile.id, name: profile.name });
    await this.runShell(profile.connect);
    this.activeProfile = profile;
    await this.checkStatus(true);
    return this.status;
  }

  async disconnectProfile(): Promise<VPNStatus> {
    const profile = this.activeProfile;
    if (profile?.disconnect) {
      this.logger.info('Disconnecting VPN profile', { id: profile.id, name: profile.name });
      await this.runShell(profile.disconnect);
    }
    this.activeProfile = null;
    await this.checkStatus(true);
    return this.status;
  }

  private runShell(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        env: process.env,
      });
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command "${command}" exited with code ${code}`));
        }
      });
      child.on('error', (error) => reject(error));
    });
  }

  /**
   * Check current VPN status
   */
  async checkStatus(force = false): Promise<VPNStatus> {
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

    if (this.activeProfile && newStatus.connected) {
      newStatus = {
        ...newStatus,
        type: this.activeProfile.type ?? newStatus.type,
        name: this.activeProfile.name ?? newStatus.name,
        server: this.activeProfile.server ?? newStatus.server,
      };
    }

    if (force || JSON.stringify(newStatus) !== JSON.stringify(this.status)) {
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

  getActiveProfile(): VPNProfile | null {
    return this.activeProfile;
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

