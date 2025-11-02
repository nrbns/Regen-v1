/**
 * Consent Ledger
 * Signed acknowledgements for sensitive actions with plain-language summaries
 */

import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { z } from 'zod';

export const ConsentActionSchema = z.object({
  type: z.enum([
    'download',
    'form_submit',
    'login',
    'scrape',
    'export_data',
    'access_clipboard',
    'access_camera',
    'access_microphone',
    'access_filesystem',
  ]),
  description: z.string(), // Plain-language description
  target: z.string().optional(), // URL, file path, etc.
  metadata: z.record(z.unknown()).optional(),
});

export type ConsentAction = z.infer<typeof ConsentActionSchema>;

export interface ConsentRecord {
  id: string;
  action: ConsentAction;
  timestamp: number;
  userId: string; // For future multi-user support
  signature: string; // Hash of action + timestamp + id
  approved: boolean;
  revokedAt?: number;
}

const consentRecords: ConsentRecord[] = [];

/**
 * Create a consent request
 */
export function createConsentRequest(action: ConsentAction): string {
  const id = randomUUID();
  const timestamp = Date.now();
  const userId = 'default'; // For MVP, use default user; in production, would get from user context

  // Create signature
  const data = JSON.stringify({ id, action, timestamp, userId });
  const signature = createHash('sha256').update(data).digest('hex');

  const record: ConsentRecord = {
    id,
    action,
    timestamp,
    userId,
    signature,
    approved: false,
  };

  consentRecords.push(record);
  return id;
}

/**
 * Approve a consent request
 */
export function approveConsent(consentId: string): boolean {
  const record = consentRecords.find(r => r.id === consentId);
  if (!record) return false;
  if (record.revokedAt) return false;

  record.approved = true;
  return true;
}

/**
 * Revoke a consent (if reversible)
 */
export function revokeConsent(consentId: string): boolean {
  const record = consentRecords.find(r => r.id === consentId);
  if (!record) return false;
  if (!record.approved) return false;

  record.revokedAt = Date.now();
  return true;
}

/**
 * Check if consent exists and is valid for an action
 */
export function hasValidConsent(action: ConsentAction): boolean {
  // Check for recent valid consent for similar action
  const recent = consentRecords
    .filter(r => 
      r.action.type === action.type &&
      r.approved &&
      !r.revokedAt &&
      Date.now() - r.timestamp < 3600000 // 1 hour TTL
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (recent.length > 0) {
    // Check if target matches (if specified)
    if (action.target) {
      return recent.some(r => r.action.target === action.target);
    }
    return true;
  }

  return false;
}

/**
 * Get consent record by ID
 */
export function getConsent(consentId: string): ConsentRecord | undefined {
  return consentRecords.find(r => r.id === consentId);
}

/**
 * List all consent records
 */
export function listConsents(filter?: { type?: ConsentAction['type']; approved?: boolean }): ConsentRecord[] {
  let filtered = [...consentRecords];

  if (filter?.type) {
    filtered = filtered.filter(r => r.action.type === filter.type);
  }

  if (filter?.approved !== undefined) {
    filtered = filtered.filter(r => r.approved === filter.approved);
  }

  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Export consent ledger (for transparency)
 */
export function exportConsentLedger(): string {
  return JSON.stringify(consentRecords, null, 2);
}

/**
 * Consent Ledger class for dependency injection
 */
export class ConsentLedger {
  createRequest(action: ConsentAction): string {
    return createConsentRequest(action);
  }

  approve(consentId: string): boolean {
    return approveConsent(consentId);
  }

  revoke(consentId: string): boolean {
    return revokeConsent(consentId);
  }

  hasValidConsent(action: ConsentAction): boolean {
    return hasValidConsent(action);
  }

  get(consentId: string): ConsentRecord | undefined {
    return getConsent(consentId);
  }

  list(filter?: { type?: ConsentAction['type']; approved?: boolean }): ConsentRecord[] {
    return listConsents(filter);
  }

  export(): string {
    return exportConsentLedger();
  }
}

