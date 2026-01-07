export type IdentityVaultStatus = 'locked' | 'unlocked' | 'uninitialized';

export interface IdentityCredential {
  id: string;
  domain: string;
  username: string;
  secretHint?: string | null;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number | null;
  tags?: string[];
}

export interface IdentityRevealPayload {
  id: string;
  secret: string;
}

export interface IdentityVaultSummary {
  status: IdentityVaultStatus;
  totalCredentials: number;
  lastUpdatedAt?: number | null;
}

