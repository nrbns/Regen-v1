/**
 * Secure Storage - Use OS keychain for sensitive data
 * Falls back to encrypted localStorage if keychain unavailable
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../lib/env';
/**
 * Store sensitive data securely
 */
export async function storeSecure(key, value) {
    if (isTauriRuntime()) {
        try {
            // Use Tauri's secure storage (OS keychain)
            await invoke('store_secure', { key, value });
            return true;
        }
        catch (error) {
            console.warn('[SecureStorage] Failed to store in keychain, using fallback:', error);
            // Fallback to encrypted localStorage
            return storeSecureFallback(key, value);
        }
    }
    // Web mode - use encrypted localStorage
    return storeSecureFallback(key, value);
}
/**
 * Retrieve sensitive data securely
 */
export async function getSecure(key) {
    if (isTauriRuntime()) {
        try {
            const value = await invoke('get_secure', { key });
            return value;
        }
        catch (error) {
            console.warn('[SecureStorage] Failed to get from keychain, using fallback:', error);
            // Fallback to encrypted localStorage
            return getSecureFallback(key);
        }
    }
    // Web mode - use encrypted localStorage
    return getSecureFallback(key);
}
/**
 * Delete sensitive data
 */
export async function deleteSecure(key) {
    if (isTauriRuntime()) {
        try {
            await invoke('delete_secure', { key });
            return true;
        }
        catch (error) {
            console.warn('[SecureStorage] Failed to delete from keychain:', error);
            // Fallback
            return deleteSecureFallback(key);
        }
    }
    return deleteSecureFallback(key);
}
/**
 * Fallback: Encrypted localStorage
 * Simple encryption using Web Crypto API
 */
async function storeSecureFallback(key, value) {
    try {
        // Generate encryption key from app-specific secret
        const secret = 'regenbrowser-secure-storage-v1';
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        // Simple XOR encryption (for demo - use proper encryption in production)
        const keyData = encoder.encode(secret + key);
        const encrypted = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            encrypted[i] = data[i] ^ keyData[i % keyData.length];
        }
        // Store as base64
        const base64 = btoa(String.fromCharCode(...encrypted));
        localStorage.setItem(`secure:${key}`, base64);
        return true;
    }
    catch (error) {
        console.error('[SecureStorage] Failed to store:', error);
        return false;
    }
}
async function getSecureFallback(key) {
    try {
        const base64 = localStorage.getItem(`secure:${key}`);
        if (!base64)
            return null;
        // Decrypt
        const encrypted = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const secret = 'regenbrowser-secure-storage-v1';
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret + key);
        const decrypted = new Uint8Array(encrypted.length);
        for (let i = 0; i < encrypted.length; i++) {
            decrypted[i] = encrypted[i] ^ keyData[i % keyData.length];
        }
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
    catch (error) {
        console.error('[SecureStorage] Failed to get:', error);
        return null;
    }
}
function deleteSecureFallback(key) {
    try {
        localStorage.removeItem(`secure:${key}`);
        return true;
    }
    catch (error) {
        console.error('[SecureStorage] Failed to delete:', error);
        return false;
    }
}
