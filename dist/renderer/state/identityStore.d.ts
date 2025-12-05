import type { IdentityCredential, IdentityRevealPayload, IdentityVaultSummary } from '../types/identity';
interface IdentityState {
    status: IdentityVaultSummary | null;
    credentials: IdentityCredential[];
    loading: boolean;
    error: string | null;
    revealingId: string | null;
    unlock: (passphrase: string) => Promise<void>;
    lock: () => Promise<void>;
    refresh: () => Promise<void>;
    addCredential: (payload: {
        domain: string;
        username: string;
        secret: string;
        secretHint?: string | null;
        tags?: string[];
    }) => Promise<void>;
    removeCredential: (id: string) => Promise<void>;
    revealCredential: (id: string) => Promise<IdentityRevealPayload | null>;
    setError: (message: string | null) => void;
}
export declare const useIdentityStore: import("zustand").UseBoundStore<import("zustand").StoreApi<IdentityState>>;
export {};
