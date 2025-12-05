/**
 * TermsAcceptance - First-run TOS acceptance component
 *
 * Displays Terms of Service and requires user acceptance before proceeding.
 */
interface TermsAcceptanceProps {
    onAccept: () => void;
    onDecline: () => void;
}
export declare function TermsAcceptance({ onAccept, onDecline }: TermsAcceptanceProps): import("react/jsx-runtime").JSX.Element | null;
export {};
