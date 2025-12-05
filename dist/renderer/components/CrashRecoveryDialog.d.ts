/**
 * Crash Recovery Dialog
 * Shows when a tab crashes and offers recovery options
 */
interface CrashRecoveryDialogProps {
    tabId: string;
    reason?: string;
    exitCode?: number;
    onClose: () => void;
    onReload: () => void;
}
export declare function CrashRecoveryDialog({ tabId: _tabId, reason, exitCode, onClose, onReload, }: CrashRecoveryDialogProps): import("react/jsx-runtime").JSX.Element;
/**
 * Hook to manage crash recovery dialog state
 */
export declare function useCrashRecovery(): {
    crashedTab: {
        tabId: string;
        reason?: string;
        exitCode?: number;
    } | null;
    setCrashedTab: import("react").Dispatch<import("react").SetStateAction<{
        tabId: string;
        reason?: string;
        exitCode?: number;
    } | null>>;
    handleReload: () => Promise<void>;
};
export {};
