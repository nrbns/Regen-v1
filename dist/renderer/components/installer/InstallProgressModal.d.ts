/**
 * Beautiful Install Progress Modal
 * Shows "Downloading your AI brain..." with sexy progress bar
 */
interface Props {
    onComplete: () => void;
    onError: (error: Error) => void;
}
export declare function InstallProgressModal({ onComplete, onError }: Props): import("react/jsx-runtime").JSX.Element;
export {};
