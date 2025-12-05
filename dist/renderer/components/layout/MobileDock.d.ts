import type { AppState } from '../../state/appStore';
type ModeId = AppState['mode'];
interface MobileDockProps {
    activeMode: ModeId;
    onSelectMode: (mode: ModeId) => void;
    onOpenLibrary: () => void;
    onOpenAgent: () => void;
}
export declare function MobileDock({ activeMode, onSelectMode, onOpenLibrary, onOpenAgent, }: MobileDockProps): import("react/jsx-runtime").JSX.Element;
export {};
