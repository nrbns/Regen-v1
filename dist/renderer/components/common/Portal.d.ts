import { type ReactNode } from 'react';
interface PortalProps {
    children: ReactNode;
    containerId?: string;
}
export declare function Portal({ children, containerId }: PortalProps): import("react").ReactPortal | null;
export {};
