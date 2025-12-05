/**
 * Secure Storage - Use OS keychain for sensitive data
 * Falls back to encrypted localStorage if keychain unavailable
 */
/**
 * Store sensitive data securely
 */
export declare function storeSecure(key: string, value: string): Promise<boolean>;
/**
 * Retrieve sensitive data securely
 */
export declare function getSecure(key: string): Promise<string | null>;
/**
 * Delete sensitive data
 */
export declare function deleteSecure(key: string): Promise<boolean>;
