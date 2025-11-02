/**
 * Profile System
 * Manages multi-profile containers with isolated sessions
 */

import { session, Session } from 'electron';
import { randomUUID } from 'node:crypto';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { ProfileCreateRequest, Profile, ProxyProfile } from '../shared/ipc/schema';

export interface ProfileData {
  id: string;
  name: string;
  createdAt: number;
  partition: string;
  proxy?: ProxyProfile;
}

const profiles = new Map<string, ProfileData>();
const sessions = new Map<string, Session>();

/**
 * Create a new profile
 */
export function createProfile(name: string, proxy?: ProxyProfile): ProfileData {
  const id = randomUUID();
  const profile: ProfileData = {
    id,
    name,
    createdAt: Date.now(),
    partition: `persist:profile:${id}`,
    proxy,
  };
  
  // Create isolated session
  const sess = session.fromPartition(profile.partition, { cache: false });
  sessions.set(id, sess);
  
  profiles.set(id, profile);
  return profile;
}

/**
 * Get profile by ID
 */
export function getProfile(id: string): ProfileData | undefined {
  return profiles.get(id);
}

/**
 * Get profile session
 */
export function getProfileSession(id: string): Session | undefined {
  return sessions.get(id);
}

/**
 * List all profiles
 */
export function listProfiles(): ProfileData[] {
  return Array.from(profiles.values());
}

/**
 * Delete a profile
 */
export function deleteProfile(id: string): boolean {
  const profile = profiles.get(id);
  if (!profile) return false;
  
  // Clear session data
  const sess = sessions.get(id);
  if (sess) {
    sess.clearStorageData().catch(() => {});
    sessions.delete(id);
  }
  
  profiles.delete(id);
  return true;
}

/**
 * Update profile proxy
 */
export function updateProfileProxy(profileId: string, proxy?: ProxyProfile): boolean {
  const profile = profiles.get(profileId);
  if (!profile) return false;
  
  profile.proxy = proxy;
  profiles.set(profileId, profile);
  return true;
}

/**
 * Get profile partition string for tab creation
 */
export function getProfilePartition(profileId: string): string | null {
  const profile = profiles.get(profileId);
  return profile?.partition || null;
}

/**
 * Register IPC handlers for profiles
 */
export function registerProfileIpc(): void {
  registerHandler('profiles:create', ProfileCreateRequest, async (_event, request) => {
    const profile = createProfile(request.name, request.proxy);
    return {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt,
      proxy: profile.proxy,
    } as Profile;
  });

  registerHandler('profiles:list', z.object({}), async () => {
    return listProfiles().map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      proxy: p.proxy,
    })) as Profile[];
  });

  registerHandler('profiles:get', z.object({ id: z.string() }), async (_event, request) => {
    const profile = getProfile(request.id);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt,
      proxy: profile.proxy,
    } as Profile;
  });

  registerHandler('profiles:delete', z.object({ id: z.string() }), async (_event, request) => {
    return { success: deleteProfile(request.id) };
  });

  registerHandler('profiles:updateProxy', z.object({
    profileId: z.string(),
    proxy: ProxyProfile.optional(),
  }), async (_event, request) => {
    return { success: updateProfileProxy(request.profileId, request.proxy) };
  });
}

