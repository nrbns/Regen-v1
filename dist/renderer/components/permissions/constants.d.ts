import { Camera } from 'lucide-react';
export type PermissionKey = 'media' | 'display-capture' | 'notifications' | 'fullscreen';
export declare const PERMISSION_OPTIONS: Array<{
    key: PermissionKey;
    label: string;
    description: string;
    icon: typeof Camera;
}>;
