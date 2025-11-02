/**
 * Permission Prompts System
 * Granular permissions (camera, mic, fs) with per-origin TTL
 */

import { z } from 'zod';
import { ConsentLedger } from './consent-ledger';

export type PermissionType = 'camera' | 'microphone' | 'filesystem' | 'clipboard:write' | 'notifications';

export const PermissionRequestSchema = z.object({
  type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']),
  origin: z.string().url(),
  description: z.string().optional(),
});

export type PermissionRequest = z.infer<typeof PermissionRequestSchema>;

interface PermissionRecord {
  type: PermissionType;
  origin: string;
  granted: boolean;
  grantedAt: number;
  expiresAt: number; // TTL-based expiration
}

const permissionCache = new Map<string, PermissionRecord>();

const DEFAULT_TTL_MS = {
  camera: 3600000, // 1 hour
  microphone: 3600000,
  filesystem: 86400000, // 24 hours
  'clipboard:write': 3600000,
  notifications: 86400000,
};

/**
 * Check if permission is granted for an origin
 */
export function hasPermission(type: PermissionType, origin: string): boolean {
  const key = `${type}:${origin}`;
  const record = permissionCache.get(key);

  if (!record) return false;
  if (!record.granted) return false;
  if (Date.now() > record.expiresAt) {
    permissionCache.delete(key);
    return false;
  }

  return true;
}

/**
 * Request permission (returns consent ID if requires user approval)
 */
export function requestPermission(request: PermissionRequest): { granted: boolean; consentId?: string } {
  const key = `${request.type}:${request.origin}`;
  const existing = permissionCache.get(key);

  // Check existing permission
  if (existing && existing.granted && Date.now() < existing.expiresAt) {
    return { granted: true };
  }

  // Check consent ledger for recent consent
  const ledger = new ConsentLedger();
  const consentAction = {
    type: getConsentActionType(request.type),
    description: `Request ${request.type} access from ${request.origin}`,
    target: request.origin,
  };

  if (ledger.hasValidConsent(consentAction)) {
    grantPermission(request.type, request.origin);
    return { granted: true };
  }

  // Requires user approval
  const consentId = ledger.createRequest(consentAction);
  return { granted: false, consentId };
}

/**
 * Grant permission for an origin
 */
export function grantPermission(type: PermissionType, origin: string): void {
  const key = `${type}:${origin}`;
  const ttl = DEFAULT_TTL_MS[type];
  
  permissionCache.set(key, {
    type,
    origin,
    granted: true,
    grantedAt: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Revoke permission for an origin
 */
export function revokePermission(type: PermissionType, origin: string): void {
  const key = `${type}:${origin}`;
  permissionCache.delete(key);
}

/**
 * List all permissions
 */
export function listPermissions(filter?: { type?: PermissionType; origin?: string }): PermissionRecord[] {
  let records = Array.from(permissionCache.values());

  if (filter?.type) {
    records = records.filter(r => r.type === filter.type);
  }

  if (filter?.origin) {
    records = records.filter(r => r.origin === filter.origin);
  }

  // Filter expired
  records = records.filter(r => Date.now() < r.expiresAt);

  return records;
}

/**
 * Clear all permissions for an origin
 */
export function clearOriginPermissions(origin: string): void {
  const keys = Array.from(permissionCache.keys()).filter(k => k.endsWith(`:${origin}`));
  for (const key of keys) {
    permissionCache.delete(key);
  }
}

function getConsentActionType(permissionType: PermissionType): ConsentAction['type'] {
  switch (permissionType) {
    case 'camera':
      return 'access_camera';
    case 'microphone':
      return 'access_microphone';
    case 'filesystem':
      return 'access_filesystem';
    case 'clipboard:write':
      return 'access_clipboard';
    default:
      return 'access_filesystem';
  }
}

// Import type from consent-ledger
type ConsentAction = import('./consent-ledger').ConsentAction;

