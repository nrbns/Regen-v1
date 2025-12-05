/**
 * Lightning Mode - Feature #5
 * Speed booster with tracker/ad blocking
 */
export declare class LightningMode {
    private static enabled;
    private static blockedDomains;
    private static blockedScripts;
    static init(): void;
    static enable(): void;
    static disable(): void;
    static isEnabled(): boolean;
    private static loadBlocklists;
    private static injectContentScript;
    static shouldBlock(url: string): boolean;
    static addBlockedDomain(domain: string): void;
}
