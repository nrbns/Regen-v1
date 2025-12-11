/**
 * VPN Types
 */

export interface VPNProfile {
  id: string;
  name: string;
  type: 'wireguard' | 'openvpn' | 'other';
  connect: string;
  disconnect: string;
  status?: string;
  server: string;
  config?: string;
}

export interface VPNStatus {
  connected: boolean;
  profileId?: string;
  profileName?: string;
  type?: 'wireguard' | 'openvpn' | 'other';
  server?: string;
  connectedAt?: number;
  uptime?: number;
  ipAddress?: string;
  bytesIn?: number;
  bytesOut?: number;
}

export interface VPNConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

