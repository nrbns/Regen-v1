/**
 * RouterHealthBar - Shows the health status of AI providers (Ollama + Hugging Face)
 * Displays in the UI to inform users about provider availability
 */
interface RouterHealthBarProps {
    className?: string;
    showDetails?: boolean;
    position?: 'top' | 'bottom' | 'inline';
}
export declare function RouterHealthBar({ className, showDetails, position, }: RouterHealthBarProps): import("react/jsx-runtime").JSX.Element | null;
export {};
