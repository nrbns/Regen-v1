import { ProfileInfo, ProfilePolicy, ProfilePolicyBlockedEvent } from '../lib/ipc-events';
type ProfilesMap = Record<string, ProfileInfo>;
type PoliciesMap = Record<string, ProfilePolicy>;
type ProfileState = {
    profiles: ProfileInfo[];
    profilesById: ProfilesMap;
    policies: PoliciesMap;
    activeProfileId: string;
    loading: boolean;
    lastPolicyBlock?: {
        action: ProfilePolicyBlockedEvent['action'];
        profileId: string;
        timestamp: number;
    };
    loadProfiles: (force?: boolean) => Promise<void>;
    setActiveProfile: (profileId: string) => Promise<void>;
    markPolicyMessageRead: () => void;
};
declare const useProfileStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ProfileState>>;
export declare function ensureProfilesLoaded(): void;
export { useProfileStore };
