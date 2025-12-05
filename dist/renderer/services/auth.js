/**
 * Authentication Service - Tier 3 Pillar 3
 * Magic link and device code authentication
 */
import { log } from '../utils/logger';
import { track } from './analytics';
class AuthService {
    currentUser = null;
    authMethod = null;
    /**
     * Initialize auth state from storage
     */
    async initialize() {
        try {
            const stored = localStorage.getItem('regen_auth');
            if (stored) {
                const data = JSON.parse(stored);
                this.currentUser = data.user;
                this.authMethod = data.method;
                log.info('[Auth] Restored session for user:', this.currentUser?.id);
                track('auth_session_restored', { userId: this.currentUser?.id });
            }
        }
        catch (error) {
            log.error('[Auth] Failed to restore session:', error);
        }
        return this.getState();
    }
    /**
     * Request magic link
     */
    async requestMagicLink(email) {
        try {
            // TODO: Call backend API
            // For now, simulate success
            log.info('[Auth] Magic link requested for:', email);
            track('auth_magic_link_requested', { email });
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                success: true,
                message: 'Check your email for the magic link',
            };
        }
        catch (error) {
            log.error('[Auth] Magic link request failed:', error);
            return {
                success: false,
                message: 'Failed to send magic link. Please try again.',
            };
        }
    }
    /**
     * Request device code
     */
    async requestDeviceCode() {
        try {
            // TODO: Call backend API
            log.info('[Auth] Device code requested');
            track('auth_device_code_requested');
            // Generate a simple code for demo
            const code = Math.random().toString(36).slice(2, 10).toUpperCase();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            return { code, expiresAt };
        }
        catch (error) {
            log.error('[Auth] Device code request failed:', error);
            return null;
        }
    }
    /**
     * Verify magic link token
     */
    async verifyMagicLink(_token) {
        try {
            // TODO: Call backend API to verify token
            // For now, create anonymous user
            const user = {
                id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                createdAt: Date.now(),
                lastSeenAt: Date.now(),
            };
            this.currentUser = user;
            this.authMethod = 'magic_link';
            this.persistState();
            log.info('[Auth] Magic link verified, user:', user.id);
            track('auth_magic_link_verified', { userId: user.id });
            return this.getState();
        }
        catch (error) {
            log.error('[Auth] Magic link verification failed:', error);
            throw error;
        }
    }
    /**
     * Verify device code
     */
    async verifyDeviceCode(_code) {
        try {
            // TODO: Call backend API to verify code
            // For now, create anonymous user
            const user = {
                id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                createdAt: Date.now(),
                lastSeenAt: Date.now(),
            };
            this.currentUser = user;
            this.authMethod = 'device_code';
            this.persistState();
            log.info('[Auth] Device code verified, user:', user.id);
            track('auth_device_code_verified', { userId: user.id });
            return this.getState();
        }
        catch (error) {
            log.error('[Auth] Device code verification failed:', error);
            throw error;
        }
    }
    /**
     * Create anonymous session
     */
    async createAnonymousSession() {
        const user = {
            id: `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: Date.now(),
            lastSeenAt: Date.now(),
        };
        this.currentUser = user;
        this.authMethod = 'anonymous';
        this.persistState();
        log.info('[Auth] Anonymous session created:', user.id);
        track('auth_anonymous_session_created', { userId: user.id });
        return this.getState();
    }
    /**
     * Sign out
     */
    async signOut() {
        const userId = this.currentUser?.id;
        this.currentUser = null;
        this.authMethod = null;
        localStorage.removeItem('regen_auth');
        log.info('[Auth] User signed out:', userId);
        track('auth_signed_out', { userId });
    }
    /**
     * Get current auth state
     */
    getState() {
        return {
            user: this.currentUser,
            isAuthenticated: !!this.currentUser,
            method: this.authMethod,
        };
    }
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Persist auth state
     */
    persistState() {
        localStorage.setItem('regen_auth', JSON.stringify({
            user: this.currentUser,
            method: this.authMethod,
        }));
    }
    /**
     * Update last seen
     */
    updateLastSeen() {
        if (this.currentUser) {
            this.currentUser.lastSeenAt = Date.now();
            this.persistState();
        }
    }
}
// Singleton instance
export const authService = new AuthService();
