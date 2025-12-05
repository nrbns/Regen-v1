type MediaKind = 'video' | 'audio';
export declare function getMediaKind(fileName?: string | null): MediaKind | null;
export interface MediaPlayerProps {
    filePath: string;
    fileName?: string;
    autoPlay?: boolean;
    onClose: () => void;
}
export declare function MediaPlayer({ filePath, fileName, autoPlay, onClose }: MediaPlayerProps): import("react/jsx-runtime").JSX.Element;
export {};
