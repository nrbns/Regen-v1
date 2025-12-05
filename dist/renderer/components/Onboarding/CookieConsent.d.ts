/**
 * CookieConsent - GDPR-Compliant Cookie Consent Banner
 *
 * Displays cookie consent options and stores user preferences.
 * Complies with GDPR requirements for cookie consent.
 */
export type CookieCategory = 'essential' | 'analytics' | 'functional' | 'advertising';
export interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    functional: boolean;
    advertising: boolean;
    timestamp: number;
    version: string;
}
interface CookieConsentProps {
    onAccept: (preferences: CookiePreferences) => void;
    onDecline?: () => void;
    showSettings?: boolean;
}
export declare function CookieConsent({ onAccept, onDecline, showSettings }: CookieConsentProps): import("react/jsx-runtime").JSX.Element | null;
/**
 * Hook to check if cookie consent has been given
 */
export declare function useCookieConsent(): {
    hasConsented: boolean;
    preferences: CookiePreferences | null;
    showConsent: () => void;
};
/**
 * Get current cookie preferences
 */
export declare function getCookiePreferences(): CookiePreferences | null;
/**
 * Check if a specific cookie category is enabled
 */
export declare function isCookieCategoryEnabled(category: CookieCategory): boolean;
export {};
