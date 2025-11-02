/**
 * Consent Ledger IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { ConsentLedger, ConsentActionSchema } from './consent-ledger';

const ledger = new ConsentLedger();

export function registerConsentIpc(): void {
  registerHandler('consent:createRequest', ConsentActionSchema, async (_event, request) => {
    return { consentId: ledger.createRequest(request) };
  });

  registerHandler('consent:approve', z.object({ consentId: z.string() }), async (_event, request) => {
    return { success: ledger.approve(request.consentId) };
  });

  registerHandler('consent:revoke', z.object({ consentId: z.string() }), async (_event, request) => {
    return { success: ledger.revoke(request.consentId) };
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
    return { ledger: ledger.export() };
  });
}

