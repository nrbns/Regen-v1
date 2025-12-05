import type { ConsentRecord, ConsentActionType } from '../types/consent';
interface ConsentOverlayState {
    visible: boolean;
    loading: boolean;
    error: string | null;
    filter: {
        type?: ConsentActionType | 'all';
        status?: 'all' | 'pending' | 'approved' | 'revoked';
    };
    records: ConsentRecord[];
    open: () => Promise<void>;
    close: () => void;
    toggle: () => Promise<void>;
    refresh: () => Promise<void>;
    setFilter: (filter: Partial<ConsentOverlayState['filter']>) => Promise<void>;
    approve: (consentId: string) => Promise<void>;
    revoke: (consentId: string) => Promise<void>;
}
export declare const useConsentOverlayStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ConsentOverlayState>>;
export {};
