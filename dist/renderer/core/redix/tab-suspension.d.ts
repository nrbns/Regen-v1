export declare function startTabSuspensionService(): void;
export declare function resumeSuspendedTab(tabId: string, options?: {
    activate?: boolean;
}): Promise<void>;
export declare function acknowledgeSuspendedTab(tabId: string): void;
export declare function manuallySuspendTab(tabId: string): Promise<void>;
