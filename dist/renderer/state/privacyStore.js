import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
const defaultTor = {
    running: false,
    bootstrapped: false,
    circuitEstablished: false,
    progress: 0,
    stub: false,
    error: null,
    loading: false,
    lastChecked: null,
};
const defaultVpn = {
    connected: false,
    type: undefined,
    name: undefined,
    stub: false,
    loading: false,
    lastChecked: null,
};
export const usePrivacyStore = create((set, get) => ({
    tor: defaultTor,
    vpn: defaultVpn,
    async refreshTor() {
        set((state) => ({ tor: { ...state.tor, loading: true } }));
        try {
            const status = await ipc.tor.status();
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
        }
        catch (error) {
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
            const status = await ipc.vpn.status();
            set({
                vpn: {
                    connected: Boolean(status?.connected),
                    type: status?.type ?? undefined,
                    name: status?.name ?? undefined,
                    stub: Boolean(status?.stub),
                    loading: false,
                    lastChecked: Date.now(),
                },
            });
        }
        catch {
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
            if (response?.stub) {
                set((state) => ({
                    tor: {
                        ...state.tor,
                        stub: true,
                        error: response?.warning ?? 'Tor binary not found; running in stub mode.',
                    },
                }));
            }
        }
        catch (error) {
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
        }
        catch (error) {
            set({
                tor: {
                    ...get().tor,
                    error: error instanceof Error ? error.message : String(error),
                },
            });
        }
        finally {
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
        }
        catch (error) {
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
            const status = await ipc.vpn.check();
            set({
                vpn: {
                    connected: Boolean(status?.connected),
                    type: status?.type ?? undefined,
                    name: status?.name ?? undefined,
                    stub: Boolean(status?.stub),
                    loading: false,
                    lastChecked: Date.now(),
                },
            });
        }
        catch {
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
