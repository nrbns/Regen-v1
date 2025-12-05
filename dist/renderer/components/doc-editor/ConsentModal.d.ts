/**
 * Consent Modal for Cloud LLM Usage
 * Required before sending documents to cloud APIs
 */
interface ConsentModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onReject: () => void;
    fileName: string;
}
export declare function ConsentModal({ isOpen, onAccept, onReject, fileName }: ConsentModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
