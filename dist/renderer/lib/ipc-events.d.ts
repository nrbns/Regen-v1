/**
 * Real-time IPC Event System
 * Typed event listeners for live updates from main process
 */
export interface TabUpdate {
    id: string;
    title: string;
    url: string;
    active: boolean;
    favicon?: string;
    progress?: number;
    isLoading?: boolean;
    mode?: 'normal' | 'ghost' | 'private';
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    createdAt?: number;
    lastActiveAt?: number;
    sessionId?: string;
    profileId?: string;
}
export interface ContainerInfo {
    id: string;
    name: string;
    color: string;
    icon?: string;
    description?: string;
    scope?: 'global' | 'session' | 'ephemeral';
    persistent?: boolean;
    system?: boolean;
}
export type ProfileKind = 'default' | 'work' | 'personal' | 'custom';
export interface ProfilePolicy {
    allowDownloads: boolean;
    allowPrivateWindows: boolean;
    allowGhostTabs: boolean;
    allowScreenshots: boolean;
    allowClipping: boolean;
}
export interface ProfileInfo {
    id: string;
    name: string;
    color?: string;
    kind?: ProfileKind;
    system?: boolean;
    policy?: ProfilePolicy;
    description?: string;
}
export type ProfilePolicyAction = 'downloads' | 'private-window' | 'ghost-tab' | 'screenshot' | 'clip';
export interface ProfilePolicyBlockedEvent {
    profileId: string;
    action: ProfilePolicyAction;
}
export interface ShieldsCounters {
    tabId: string;
    ads: number;
    trackers: number;
    httpsUpgrades: number;
    cookiesBlocked: number;
}
export interface NetworkStatus {
    proxy?: {
        enabled: boolean;
        type: 'socks5' | 'http' | 'tor';
        host?: string;
    };
    tor?: {
        enabled: boolean;
        circuitEstablished: boolean;
        identity: string;
        progress?: number;
        bootstrapped?: boolean;
        error?: string;
        stub?: boolean;
    };
    vpn?: {
        enabled: boolean;
        connected: boolean;
        provider?: string;
        server?: string;
        interface?: string;
    };
    doh?: {
        enabled: boolean;
        provider: string;
    };
}
export interface PageWatcher {
    id: string;
    url: string;
    createdAt: number;
    intervalMinutes: number;
    lastCheckedAt?: number;
    lastHash?: string;
    lastChangeAt?: number;
    status: 'idle' | 'checking' | 'changed' | 'error';
    error?: string;
}
export interface DownloadUpdate {
    id: string;
    url: string;
    filename: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'blocked' | 'verifying';
    progress?: number;
    receivedBytes?: number;
    totalBytes?: number;
    path?: string;
    checksum?: string;
    createdAt?: number;
    speedBytesPerSec?: number;
    etaSeconds?: number;
    safety?: {
        status: 'pending' | 'clean' | 'warning' | 'blocked' | 'unknown';
        threatLevel?: 'low' | 'medium' | 'high' | 'critical';
        details?: string;
        recommendations?: string[];
        scannedAt?: number;
        quarantinePath?: string;
    };
}
export interface AgentStep {
    taskId: string;
    stepId: string;
    type: 'plan' | 'tool' | 'log' | 'result';
    content: string;
    timestamp: number;
}
export interface AgentPlan {
    taskId: string;
    steps: Array<{
        id: string;
        description: string;
        tool?: string;
    }>;
    budget: {
        tokens: number;
        seconds: number;
        requests: number;
    };
    remaining: {
        tokens: number;
        seconds: number;
        requests: number;
    };
}
export interface PermissionRequest {
    id: string;
    origin: string;
    permission: 'camera' | 'microphone' | 'filesystem' | 'notifications';
    callback: (granted: boolean, remember?: boolean) => void;
}
export interface ConsentRequest {
    id: string;
    action: {
        type: string;
        description: string;
        risk: 'low' | 'medium' | 'high';
    };
    callback: (approved: boolean) => void;
}
export interface TabNavigationState {
    tabId: string;
    canGoBack: boolean;
    canGoForward: boolean;
}
export interface EfficiencyModeEvent {
    mode: 'normal' | 'battery-saver' | 'extreme';
    label?: string | null;
    badge?: string | null;
    timestamp: number;
    snapshot: {
        batteryPct: number | null;
        charging: boolean | null;
        ramMb: number;
        cpuLoad1: number;
        activeTabs: number;
        carbonIntensity?: number | null;
        carbonRegion?: string | null;
    };
}
export interface EfficiencyAlertAction {
    id: string;
    label: string;
    type: 'mode' | 'hibernate';
    mode?: 'normal' | 'battery-saver' | 'extreme';
}
export interface EfficiencyAlert {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: number;
    actions: EfficiencyAlertAction[];
}
export interface GameSandboxWarning {
    sandboxId: string;
    gameId: string;
    warnings: Array<{
        severity: 'warning' | 'critical';
        message: string;
    }>;
    metrics?: {
        fps?: number;
        droppedFrames?: number;
        memoryMb?: number;
        cpuPercent?: number;
    };
}
export interface PrivacyAuditSummary {
    score: number;
    grade: 'low' | 'moderate' | 'high';
    trackers: Array<{
        host: string;
        count: number;
    }>;
    thirdPartyHosts: Array<{
        host: string;
        count: number;
    }>;
    message: string;
    suggestions: string[];
    timestamp: number;
    ai?: {
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        summary: string;
        actions: string[];
        issues: Array<{
            category: string;
            detail: string;
            severity: 'low' | 'medium' | 'high';
        }>;
        generatedAt?: string;
    } | null;
}
declare class IPCEventBus {
    private listeners;
    private ipcListeners;
    private customEventHandlers;
    private registeredChannels;
    private ipcHandlers;
    on<T>(event: string, callback: (data: T) => void): () => void;
    emit(event: string, data: any): void;
    off(event: string, callback: (data: any) => void): void;
    removeAllListeners(event: string): void;
}
export declare const ipcEvents: IPCEventBus;
export {};
