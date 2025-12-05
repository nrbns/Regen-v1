import { Camera, MonitorUp, Bell, Maximize2 } from 'lucide-react';
export const PERMISSION_OPTIONS = [
    {
        key: 'media',
        label: 'Camera & microphone',
        description: 'Allow access to audio/video input devices.',
        icon: Camera,
    },
    {
        key: 'display-capture',
        label: 'Screen capture',
        description: 'Enable screen or window sharing.',
        icon: MonitorUp,
    },
    {
        key: 'notifications',
        label: 'Desktop notifications',
        description: 'Permit this container to show system notifications.',
        icon: Bell,
    },
    {
        key: 'fullscreen',
        label: 'Fullscreen & Picture-in-picture',
        description: 'Allow fullscreen transitions and PiP overlays.',
        icon: Maximize2,
    },
];
