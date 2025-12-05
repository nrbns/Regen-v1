import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';
const mergeProfiles = (existing, incoming) => {
    const next = { ...existing };
    for (const profile of incoming) {
        next[profile.id] = profile;
    }
    return next;
};
const useProfileStore = create((set, get) => ({
    profiles: [],
    profilesById: {},
    policies: {},
    activeProfileId: 'default',
    loading: false,
    async loadProfiles(force = false) {
        const { loading } = get();
        if (loading && !force) {
            return;
        }
        set({ loading: true });
        try {
            const [list, active] = await Promise.all([
                ipc.profiles.list(),
                ipc.profiles.getActive(),
            ]);
            const updatedProfilesById = mergeProfiles(get().profilesById, list);
            if (active) {
                updatedProfilesById[active.id] = active;
            }
            const policyUpdates = { ...get().policies };
            for (const profile of list) {
                if (profile.policy) {
                    policyUpdates[profile.id] = profile.policy;
                }
            }
            if (active?.id && !policyUpdates[active.id]) {
                try {
                    const policy = await ipc.profiles.getPolicy(active.id);
                    policyUpdates[active.id] = policy;
                }
                catch (error) {
                    console.warn('[Profiles] Failed to fetch policy for active profile', error);
                }
            }
            set({
                profiles: list,
                profilesById: updatedProfilesById,
                policies: policyUpdates,
                activeProfileId: active?.id ?? 'default',
            });
        }
        catch (error) {
            console.error('[Profiles] Failed to load profiles', error);
        }
        finally {
            set({ loading: false });
        }
    },
    async setActiveProfile(profileId) {
        try {
            const result = await ipc.profiles.setActive(profileId);
            const policy = result.policy ?? (await ipc.profiles.getPolicy(result.id));
            const nextProfilesById = mergeProfiles(get().profilesById, [result]);
            set((state) => ({
                activeProfileId: result.id,
                profilesById: nextProfilesById,
                profiles: state.profiles.map((profile) => profile.id === result.id ? { ...profile, ...result } : profile),
                policies: {
                    ...state.policies,
                    [result.id]: policy,
                },
            }));
        }
        catch (error) {
            console.error('[Profiles] Failed to activate profile', error);
            throw error;
        }
    },
    markPolicyMessageRead() {
        set({ lastPolicyBlock: undefined });
    },
}));
ipcEvents.on('profiles:active', (payload) => {
    if (!payload?.profileId)
        return;
    const state = useProfileStore.getState();
    const { profileId, profile } = payload;
    const policy = profile.policy;
    useProfileStore.setState((prev) => ({
        activeProfileId: profileId,
        profilesById: mergeProfiles(prev.profilesById, [profile]),
        profiles: prev.profiles.some((p) => p.id === profileId)
            ? prev.profiles.map((p) => (p.id === profileId ? { ...p, ...profile } : p))
            : [...prev.profiles, profile],
        policies: policy
            ? {
                ...prev.policies,
                [profileId]: policy,
            }
            : prev.policies,
    }));
    if (!state.policies[profileId] && !policy) {
        ipc.profiles
            .getPolicy(profileId)
            .then((policyResponse) => {
            useProfileStore.setState((prev) => ({
                policies: {
                    ...prev.policies,
                    [profileId]: policyResponse,
                },
            }));
        })
            .catch((error) => console.warn('[Profiles] Failed to refresh policy', error));
    }
});
ipcEvents.on('profiles:policy-blocked', (payload) => {
    if (!payload?.profileId || !payload?.action)
        return;
    useProfileStore.setState({
        lastPolicyBlock: {
            action: payload.action,
            profileId: payload.profileId,
            timestamp: Date.now(),
        },
    });
});
export function ensureProfilesLoaded() {
    void useProfileStore.getState().loadProfiles();
}
export { useProfileStore };
