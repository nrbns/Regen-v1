import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';

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

const defaultTor: TorStatus = {
  running: false,
  bootstrapped: false,
  circuitEstablished: false,
  progress: 0,
  stub: false,
  error: null,
  loading: false,
  lastChecked: null,
};

const defaultVpn: VpnStatus = {
  connected: false,
  type: undefined,
  name: undefined,
  stub: false,
  loading: false,
  lastChecked: null,
};

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  tor: defaultTor,
  vpn: defaultVpn,
  async refreshTor() {
    set((state) => ({ tor: { ...state.tor, loading: true } }));
    try {
      const status = await ipc.tor.status() as any;
      set({
        tor: {
          running: Boolean(status?.running),
          bootstrapped: Boolean(status?.bootstrapped),
          circuitEstablished: Boolean(status?.circuitEstablished),
          progress: typeof status?.progress === 'number' ? status.progress : 0,
          stub: Boolean(status?.stub),
          error: typeof status?.error === 'string' ? status.error : null,
          loading: false,
          lastChecked: Date.now(),
        },
      });
    } catch (error) {
      set({
        tor: {
          ...get().tor,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
          lastChecked: Date.now(),
        },
      });
    }
  },
  async refreshVpn() {
    set((state) => ({ vpn: { ...state.vpn, loading: true } }));
    try {
      const status = await ipc.vpn.status() as any;
      set({
        vpn: {
          connected: Boolean(status?.connected),
          type: status?.type ?? undefined,
          name: status?.name ?? undefined,
          stub: Boolean((status as any)?.stub),
          loading: false,
          lastChecked: Date.now(),
        },
      });
    } catch {
      set({
        vpn: {
          ...get().vpn,
          loading: false,
          lastChecked: Date.now(),
        },
      });
    }
  },
  async startTor() {
    set((state) => ({ tor: { ...state.tor, loading: true, error: null } }));
    try {
      const response = await ipc.tor.start();
      await get().refreshTor();
      if ((response as any)?.stub) {
        set((state) => ({
          tor: {
            ...state.tor,
            stub: true,
            error: (response as any)?.warning ?? 'Tor binary not found; running in stub mode.',
          },
        }));
      }
    } catch (error) {
      set({
        tor: {
          ...defaultTor,
          error: error instanceof Error ? error.message : String(error),
          loading: false,
          lastChecked: Date.now(),
        },
      });
    }
  },
  async stopTor() {
    set((state) => ({ tor: { ...state.tor, loading: true } }));
    try {
      await ipc.tor.stop();
    } catch (error) {
      set({
        tor: {
          ...get().tor,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      set({
        tor: {
          ...defaultTor,
          lastChecked: Date.now(),
        },
      });
    }
  },
  async newTorIdentity() {
    try {
      await ipc.tor.newIdentity();
      await get().refreshTor();
    } catch (error) {
      set({
        tor: {
          ...get().tor,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  },
  async checkVpn() {
    set((state) => ({ vpn: { ...state.vpn, loading: true } }));
    try {
      const status = await ipc.vpn.check() as any;
      set({
        vpn: {
          connected: Boolean(status?.connected),
          type: status?.type ?? undefined,
          name: status?.name ?? undefined,
          stub: Boolean((status as any)?.stub),
          loading: false,
          lastChecked: Date.now(),
        },
      });
    } catch {
      set({
        vpn: {
          ...get().vpn,
          loading: false,
          lastChecked: Date.now(),
        },
      });
    }
  },
}));
