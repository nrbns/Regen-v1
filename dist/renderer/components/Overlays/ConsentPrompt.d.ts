/**
 * ConsentPrompt - Agent action approval modal
 */
import { ConsentRequest } from '../../lib/ipc-events';
interface ConsentPromptProps {
    request: ConsentRequest | null;
    onClose: () => void;
}
export declare function ConsentPrompt({ request, onClose }: ConsentPromptProps): import("react/jsx-runtime").JSX.Element | null;
export {};
