/**
 * Hands-Free Mode Component
 * Continuous voice listening + TTS responses
 */
interface HandsFreeModeProps {
    sessionId: string;
    mode: 'research' | 'trade';
    onCommand?: (command: {
        type: string;
        payload: any;
    }) => void;
    onClose?: () => void;
}
export declare function HandsFreeMode({ sessionId, mode, onCommand, onClose }: HandsFreeModeProps): import("react/jsx-runtime").JSX.Element;
export {};
