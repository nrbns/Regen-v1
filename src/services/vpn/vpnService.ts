/**
 * VPN Service
 * Manages VPN connections with real-time status updates
 */

// Minimal v1 stub for VPN service — disabled in Regen-v1
import type { VPNProfile, VPNStatus, VPNConnectionResult } from './types';

export class VPNService {
  private profiles: VPNProfile[] = [];
  private status: VPNStatus | null = { connected: false, stub: true } as any;

  async initialize(): Promise<void> {
    // No-op in v1 — VPN disabled
    return;
  }

  async loadProfiles(): Promise<VPNProfile[]> {
    this.profiles = [];
    return this.profiles;
  }

  getProfiles(): VPNProfile[] {
    return [];
  }

  getProfile(_id: string): VPNProfile | undefined {
    return undefined;
  }

  async connect(_profileId: string): Promise<VPNConnectionResult> {
    return { success: false, error: 'VPN disabled in Regen-v1' } as any;
  }

  async disconnect(_profileId?: string): Promise<VPNConnectionResult> {
    return { success: false, error: 'VPN disabled in Regen-v1' } as any;
  }

  async checkStatus(): Promise<VPNStatus> {
    this.status = { connected: false, stub: true } as any;
    return this.status;
  }

  getStatus(): VPNStatus | null {
    return this.status;
  }

  startStatusMonitoring(): void {
    // no-op
  }

  stopStatusMonitoring(): void {
    // no-op
  }

  onStatusUpdate(callback: (status: VPNStatus) => void): () => void {
    try {
      callback({ connected: false, stub: true } as any);
    } catch {}
    return () => {};
  }

  destroy(): void {
    // no-op
  }
}

let vpnServiceInstance: VPNService | null = null;

export function getVPNService(): VPNService {
  if (!vpnServiceInstance) vpnServiceInstance = new VPNService();
  return vpnServiceInstance;
}
