/**
 * Redix Debug Panel
 * Time-travel debugging UI for Redix event log
 */
interface RedixDebugPanelProps {
    open: boolean;
    onClose: () => void;
}
export declare function RedixDebugPanel({ open, onClose }: RedixDebugPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
