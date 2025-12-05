/**
 * AppShell - Main layout container with all components wired
 */
declare global {
    interface Window {
        __OMNIX_TOPBAR_HEIGHT?: number;
        __omnix_apply_topbar?: () => void;
    }
}
export declare function AppShell(): import("react/jsx-runtime").JSX.Element;
