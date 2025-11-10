/**
 * Consent Ledger IPC Handlers
 */

// @ts-nocheck

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { ConsentLedger, ConsentActionSchema } from './consent-ledger';
import { appendToVault, exportVaultSnapshot, generateVaultReceipt } from './consent-vault';

const ledger = new ConsentLedger();

type Resolver = (approved: boolean) => void;
const pendingConsentResolvers = new Map<string, Resolver>();

export function waitForConsent(consentId: string): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConsentResolvers.set(consentId, resolve);
  });
}

function resolveConsent(consentId: string, approved: boolean) {
  const resolver = pendingConsentResolvers.get(consentId);
  if (resolver) {
    resolver(approved);
    pendingConsentResolvers.delete(consentId);
  }
}

export function registerConsentIpc(): void {
  registerHandler('consent:createRequest', ConsentActionSchema, async (_event, request) => {
    return { consentId: ledger.createRequest(request) };
  });

  registerHandler('consent:approve', z.object({ consentId: z.string().uuid() }), async (_event, request) => {
    const success = ledger.approve(request.consentId);
    const consent = ledger.get(request.consentId);
    if (success && consent) {
      const entry = await appendToVault(consent);
      const receipt = generateVaultReceipt(entry);
      return { success, consent, receipt };
    }
    return { success, consent };
  });

  registerHandler('consent:revoke', z.object({ consentId: z.string() }), async (_event, request) => {
    const success = ledger.revoke(request.consentId);
    if (success) {
      resolveConsent(request.consentId, false);
    }
    return { success };
  });

  registerHandler('consent:check', ConsentActionSchema, async (_event, request) => {
    return { hasConsent: ledger.hasValidConsent(request) };
  });

  registerHandler('consent:get', z.object({ consentId: z.string() }), async (_event, request) => {
    return ledger.get(request.consentId);
  });

  registerHandler('consent:list', z.object({
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
    ]).optional(),
    approved: z.boolean().optional(),
  }).optional(), async (_event, request) => {
    return ledger.list(request);
  });

  registerHandler('consent:export', z.object({}), async () => {
    return ledger.export();
  });

  registerHandler('consent:vault:export', z.object({}), async () => {
    const snapshot = await exportVaultSnapshot();
    return snapshot;
  });
}

