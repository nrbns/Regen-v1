export declare function isBackendAvailable(): boolean;
export declare function canAttemptBackendRequest(): boolean;
export declare function markBackendAvailable(): void;
export declare function markBackendUnavailable(reason?: unknown): void;
export declare function onBackendStatusChange(listener: (online: boolean) => void): () => boolean;
