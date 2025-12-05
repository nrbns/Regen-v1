/**
 * WISPR Form Auto-Fill System
 * Saves and fills user profile data in forms
 */
export interface UserProfile {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    aadhaar?: string;
    pan?: string;
    dob?: string;
    gender?: string;
    [key: string]: string | undefined;
}
/**
 * Save user profile to localStorage
 */
export declare function saveUserProfile(profile: Partial<UserProfile>): void;
/**
 * Get saved user profile
 */
export declare function getUserProfile(): UserProfile;
/**
 * Clear saved profile
 */
export declare function clearUserProfile(): void;
/**
 * Fill a form with profile data
 */
export declare function fillForm(form: HTMLFormElement, profile: UserProfile): number;
/**
 * Fill all forms on the page
 */
export declare function fillAllForms(profile?: UserProfile): number;
