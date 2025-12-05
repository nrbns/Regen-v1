/**
 * ContainerQuickSelector - Quick access to Work/Personal/Anonymous containers
 */
interface ContainerQuickSelectorProps {
    onSelect?: (containerId: string) => void;
    compact?: boolean;
    showLabel?: boolean;
}
export declare function ContainerQuickSelector({ onSelect, compact, showLabel, }: ContainerQuickSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
