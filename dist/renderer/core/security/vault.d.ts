/**
 * Secure Vault - Tier 2
 * Encrypted storage for tokens and sensitive data
 */
declare class SecureVault {
    private vaultKey;
    private storage;
    constructor();
    private getOrCreateVaultKey;
    /**
     * Store a secret
     */
    store(key: string, value: string): Promise<void>;
    /**
     * Retrieve a secret
     */
    retrieve(key: string): Promise<string | null>;
    /**
     * Delete a secret
     */
    delete(key: string): void;
    /**
     * Check if secret exists
     */
    has(key: string): boolean;
    /**
     * Clear all secrets
     */
    clear(): void;
}
export declare const secureVault: SecureVault;
export {};
