import { PowerMode } from '../../state/powerStore';
type Props = {
    selected: PowerMode;
    effective: 'Performance' | 'Balanced' | 'PowerSave';
    onClose: () => void;
    onSelect: (mode: PowerMode) => void;
};
export declare function PowerModeSelector({ selected, effective, onClose, onSelect }: Props): import("react/jsx-runtime").JSX.Element;
export {};
