/**
 * BottomStatusBar Component
 * System status tokens: CPU, RAM, Battery, Model
 */
export interface SystemStatus {
    cpu?: {
        usage: number;
        cores?: number;
    };
    ram?: {
        used: number;
        total: number;
        percentage: number;
    };
    battery?: {
        level: number;
        charging: boolean;
    };
    model?: string;
    network?: {
        connected: boolean;
        speed?: string;
    };
}
export interface BottomStatusBarProps {
    status?: SystemStatus;
    className?: string;
    showCpu?: boolean;
    showRam?: boolean;
    showBattery?: boolean;
    showModel?: boolean;
    showNetwork?: boolean;
}
/**
 * BottomStatusBar - System status display
 *
 * Features:
 * - Real-time system metrics
 * - Compact display
 * - Keyboard accessible
 * - Tooltips on hover
 */
export declare function BottomStatusBar({ status, className, showCpu, showRam, showBattery, showModel, showNetwork, }: BottomStatusBarProps): import("react/jsx-runtime").JSX.Element;
