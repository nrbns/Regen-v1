/**
 * First Launch Modal - Day 3: Enhanced Onboarding
 * Shows AI setup progress with emoji themes and smooth animations
 */
interface FirstLaunchModalProps {
    progress: number;
    status: string;
    onComplete: () => void;
    onSkip?: () => void;
}
export declare function FirstLaunchModal({ progress, status, onComplete, onSkip }: FirstLaunchModalProps): import("react/jsx-runtime").JSX.Element;
export {};
