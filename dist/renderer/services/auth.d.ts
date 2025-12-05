/**
 * Authentication Service - Tier 3 Pillar 3
 * Magic link and device code authentication
 */
export type AuthMethod = 'magic_link' | 'device_code' | 'anonymous';
export type User = {
    id: string;
    email?: string;
    displayName?: string;
    createdAt: number;
    lastSeenAt: number;
};
export type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
    method: AuthMethod | null;
};
declare class AuthService {
    private currentUser;
    private authMethod;
    /**
     * Initialize auth state from storage
     */
    initialize(): Promise<AuthState>;
    /**
     * Request magic link
     */
    requestMagicLink(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Request device code
     */
    requestDeviceCode(): Promise<{
        code: string;
        expiresAt: number;
    } | null>;
    /**
     * Verify magic link token
     */
    verifyMagicLink(_token: string): Promise<AuthState>;
    /**
     * Verify device code
     */
    verifyDeviceCode(_code: string): Promise<AuthState>;
    /**
     * Create anonymous session
     */
    createAnonymousSession(): Promise<AuthState>;
    /**
     * Sign out
     */
    signOut(): Promise<void>;
    /**
     * Get current auth state
     */
    getState(): AuthState;
    /**
     * Get current user
     */
    getCurrentUser(): User | null;
    /**
     * Persist auth state
     */
    private persistState;
    /**
     * Update last seen
     */
    updateLastSeen(): void;
}
export declare const authService: AuthService;
export {};
