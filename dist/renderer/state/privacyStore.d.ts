export type TorStatus = {
    running: boolean;
    bootstrapped: boolean;
    circuitEstablished: boolean;
    progress: number;
    stub?: boolean;
    error?: string | null;
    loading: boolean;
    lastChecked: number | null;
};
export type VpnStatus = {
    connected: boolean;
    type?: string;
    name?: string;
    stub?: boolean;
    loading: boolean;
    lastChecked: number | null;
};
interface PrivacyState {
    tor: TorStatus;
    vpn: VpnStatus;
    refreshTor: () => Promise<void>;
    refreshVpn: () => Promise<void>;
    startTor: () => Promise<void>;
    stopTor: () => Promise<void>;
    newTorIdentity: () => Promise<void>;
    checkVpn: () => Promise<void>;
}
export declare const usePrivacyStore: import("zustand").UseBoundStore<import("zustand").StoreApi<PrivacyState>>;
export {};
