export interface SafeExitConfig {
    maxDrawdown: number;
    portfolioStopLoss: number;
    volatilityThreshold: number;
    globalKillSwitch: boolean;
}
interface SafeExitControlsProps {
    config: SafeExitConfig;
    onConfigChange: (config: SafeExitConfig) => void;
    onKillSwitch: (enabled: boolean) => void;
    onCloseAll: () => void;
    onClosePosition: (symbol: string) => void;
    openPositions: Array<{
        symbol: string;
        unrealizedPnL: number;
    }>;
}
export default function SafeExitControls({ config, onConfigChange, onKillSwitch, onCloseAll, onClosePosition, openPositions, }: SafeExitControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
