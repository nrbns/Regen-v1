/**
 * PermissionPrompt - Request permission modal with TTL
 */
import { PermissionRequest } from '../../lib/ipc-events';
interface PermissionPromptProps {
    request: PermissionRequest | null;
    onClose: () => void;
}
export declare function PermissionPrompt({ request, onClose }: PermissionPromptProps): import("react/jsx-runtime").JSX.Element | null;
export {};
