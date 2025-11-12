import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import {
  getVaultStatus,
  unlockVault,
  lockVault,
  listCredentials,
  addCredential,
  removeCredential,
  revealCredential,
} from './identity-vault';

const credentialSchema = z.object({
  domain: z.string().min(1),
  username: z.string().min(1),
  secret: z.string().min(1),
  secretHint: z.string().max(140).optional(),
  tags: z.array(z.string()).optional(),
});

export function registerIdentityIpc(): void {
  registerHandler('identity:status', z.object({}).optional(), async () => getVaultStatus());

  registerHandler(
    'identity:unlock',
    z.object({ passphrase: z.string().min(8) }),
    async (_event, request) => {
      await unlockVault(request.passphrase);
      return getVaultStatus();
    },
  );

  registerHandler('identity:lock', z.object({}).optional(), async () => {
    lockVault();
    return getVaultStatus();
  });

  registerHandler('identity:list', z.object({}).optional(), async () => listCredentials());

  registerHandler('identity:add', credentialSchema, async (_event, request) => {
    const entry = await addCredential({
      domain: request.domain,
      username: request.username,
      secret: request.secret,
      secretHint: request.secretHint ?? null,
      tags: request.tags ?? [],
    });
    return entry;
  });

  registerHandler(
    'identity:remove',
    z.object({ id: z.string() }),
    async (_event, request) => {
      await removeCredential(request.id);
      return { success: true };
    },
  );

  registerHandler(
    'identity:reveal',
    z.object({ id: z.string() }),
    async (_event, request) => revealCredential(request.id),
  );
}

