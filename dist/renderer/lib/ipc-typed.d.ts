/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */
import { z } from 'zod';
import type { PrivacyAuditSummary } from './ipc-events';
import type { EcoImpactForecast } from '../types/ecoImpact';
import type { TrustSummary } from '../types/trustWeaver';
import type { NexusListResponse, NexusPluginEntry } from '../types/extensionNexus';
import type { IdentityCredential, IdentityRevealPayload, IdentityVaultSummary } from '../types/identity';
import type { ConsentAction, ConsentRecord } from '../types/consent';
export declare function deriveTitleFromUrl(url?: string): string;
/**
 * Make a typed IPC call
 * @param channel Channel name (without ob://ipc/v1/ prefix)
 * @param request Request payload
 * @param schema Optional response schema for validation
 */
export interface Plan {
    id: string;
    goal: string;
    steps: Array<{
        id: string;
        action: string;
        args: Record<string, unknown>;
        dependsOn?: string[];
        expectedOutput?: string;
    }>;
    estimatedDuration?: number;
}
export declare function ipcCall<TRequest, TResponse = unknown>(channel: string, request: TRequest, schema?: z.ZodSchema<TResponse>): Promise<TResponse>;
/**
 * Typed IPC client with pre-configured channels
 */
export declare const ipc: {
    windowControl: {
        toggleFullscreen: (force?: boolean) => Promise<{
            success: boolean;
            fullscreen: boolean;
        } | {
            success: boolean;
            fullscreen: boolean;
        }>;
        setFullscreen: (fullscreen: boolean) => Promise<{
            success: boolean;
            fullscreen: boolean;
        } | {
            success: boolean;
            fullscreen: boolean;
        }>;
        getState: () => Promise<{
            fullscreen: boolean;
        } | {
            fullscreen: boolean;
        }>;
    };
    tabs: {
        create: (input?: string | {
            url?: string;
            profileId?: string;
            mode?: "normal" | "ghost" | "private";
            containerId?: string;
            tabId?: string;
            activate?: boolean;
            createdAt?: number;
            lastActiveAt?: number;
            sessionId?: string;
            fromSessionRestore?: boolean;
        }) => Promise<unknown>;
        close: (request: {
            id: string;
        }) => Promise<unknown>;
        activate: (request: {
            id: string;
        }) => Promise<unknown>;
        navigate: (id: string, url: string) => Promise<unknown>;
        goBack: (id: string) => Promise<unknown>;
        goForward: (id: string) => Promise<unknown>;
        setMemoryCap: (tabId: string, capMB: number) => Promise<unknown>;
        devtools: (id: string) => Promise<unknown>;
        zoomIn: (id: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        zoomOut: (id: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        zoomReset: (id: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        screenshot: (id?: string) => Promise<{
            success: boolean;
            path?: string;
            error?: string;
        }>;
        capturePreview: (request: {
            id: string;
            maxWidth?: number;
            quality?: number;
        }) => Promise<{
            success: boolean;
            dataUrl?: string;
            width?: number;
            height?: number;
            error?: string;
        }>;
        pip: (id?: string, enabled?: boolean) => Promise<{
            success: boolean;
            error?: string;
        }>;
        find: (id?: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        reload: (id: string, options?: {
            hard?: boolean;
        }) => Promise<unknown>;
        stop: (id: string) => Promise<unknown>;
        list: () => Promise<{
            id: string;
            title: string;
            active: boolean;
            url?: string;
            mode?: "normal" | "ghost" | "private";
            containerId?: string;
            containerName?: string;
            containerColor?: string;
            createdAt?: number;
            lastActiveAt?: number;
            sessionId?: string;
            profileId?: string;
            sleeping?: boolean;
        }[]>;
        predictiveGroups: (options?: {
            windowId?: number;
            force?: boolean;
        }) => Promise<{
            groups: {
                id: string;
                label: string;
                tabIds: string[];
                confidence?: number;
            }[];
            prefetch: {
                tabId: string;
                url: string;
                reason?: string;
                confidence?: number;
            }[];
            summary: {
                generatedAt?: string;
                explanation?: string;
            } | undefined;
        } | {
            readonly groups: readonly [];
            readonly prefetch: readonly [];
            readonly summary: undefined;
        }>;
        moveToWorkspace: (request: {
            tabId: string;
            workspaceId: string;
            label?: string;
        }) => Promise<unknown>;
        hibernate: (id: string) => Promise<unknown>;
        wake: (id: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        burn: (id: string) => Promise<unknown>;
        onUpdated: (callback: (tabs: Array<{
            id: string;
            title: string;
            active: boolean;
            url?: string;
            mode?: "normal" | "ghost" | "private";
            containerId?: string;
            containerName?: string;
            containerColor?: string;
            createdAt?: number;
            lastActiveAt?: number;
            sessionId?: string;
            profileId?: string;
            sleeping?: boolean;
        }>) => void) => void;
        setContainer: (id: string, containerId: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        reorder: (tabId: string, newIndex: number) => Promise<{
            success: boolean;
            error?: string;
        }>;
        reopenClosed: (index?: number) => Promise<{
            success: boolean;
            tabId?: string;
            error?: string;
        }>;
        setPinned: (request: {
            id: string;
            pinned: boolean;
        }) => Promise<{
            success: boolean;
            error?: string;
            unchanged?: boolean;
        }>;
        listClosed: () => Promise<{
            id: string;
            url: string;
            title: string;
            containerId?: string;
            containerName?: string;
            containerColor?: string;
            mode?: "normal" | "ghost" | "private";
            closedAt: number;
        }[]>;
        getContext: (tabId?: string) => Promise<{
            success: boolean;
            context?: {
                tabId: string;
                url: string;
                title: string;
                pageText: string;
                domain: string;
            };
            error?: string;
        }>;
    };
    workflow: {
        launch: (query: string) => Promise<{
            success: boolean;
            workflowId?: string;
            workflowName?: string;
            results?: any[];
            error?: string;
        }>;
        list: () => Promise<{
            success: boolean;
            workflows?: Array<{
                id: string;
                name: string;
                description: string;
            }>;
        }>;
    };
    tor: {
        status(): Promise<unknown>;
        start(): Promise<unknown>;
        stop(): Promise<unknown>;
        newIdentity(): Promise<unknown>;
        getProxy(): Promise<{
            proxy: string | null;
            stub?: boolean;
        }>;
    };
    vpn: {
        status(): Promise<unknown>;
        check(): Promise<unknown>;
        listProfiles: () => Promise<{
            id: string;
            name: string;
            type: string;
            server?: string;
        }[]>;
        connect: (id: string) => Promise<{
            connected: boolean;
            type?: string;
            name?: string;
            interface?: string;
            server?: string;
        }>;
        disconnect: () => Promise<{
            connected: boolean;
            type?: string;
            name?: string;
            interface?: string;
            server?: string;
        }>;
    };
    containers: {
        list: () => Promise<{
            id: string;
            name: string;
            color: string;
            icon?: string;
            description?: string;
            scope: string;
            persistent: boolean;
            system?: boolean;
        }[]>;
        getActive: () => Promise<{
            id: string;
            name: string;
            color: string;
            icon?: string;
            description?: string;
            scope?: string;
            persistent?: boolean;
            system?: boolean;
        }>;
        setActive: (containerId: string) => Promise<{
            id: string;
            name: string;
            color: string;
            icon?: string;
            description?: string;
            scope?: string;
            persistent?: boolean;
            system?: boolean;
        }>;
        create: (payload: {
            name: string;
            color?: string;
            icon?: string;
        }) => Promise<{
            id: string;
            name: string;
            color: string;
            icon?: string;
            description?: string;
            scope?: string;
            persistent?: boolean;
            system?: boolean;
        }>;
        getPermissions: (containerId: string) => Promise<{
            containerId: string;
            permissions: string[];
        }>;
        setPermission: (containerId: string, permission: "media" | "display-capture" | "notifications" | "fullscreen", enabled: boolean) => Promise<{
            containerId: string;
            permissions: string[];
        }>;
        getSitePermissions: (containerId: string) => Promise<{
            permission: "media" | "display-capture" | "notifications" | "fullscreen";
            origins: string[];
        }[]>;
        allowSitePermission: (containerId: string, permission: "media" | "display-capture" | "notifications" | "fullscreen", origin: string) => Promise<{
            permission: "media" | "display-capture" | "notifications" | "fullscreen";
            origins: string[];
        }[]>;
        revokeSitePermission: (containerId: string, permission: "media" | "display-capture" | "notifications" | "fullscreen", origin: string) => Promise<{
            permission: "media" | "display-capture" | "notifications" | "fullscreen";
            origins: string[];
        }[]>;
    };
    ui: {
        setChromeOffsets: (offsets: Partial<{
            top: number;
            bottom: number;
            left: number;
            right: number;
        }>) => Promise<unknown>;
    };
    proxy: {
        set: (config: {
            type?: "socks5" | "http";
            host?: string;
            port?: number;
            username?: string;
            password?: string;
            tabId?: string;
            profileId?: string;
            proxyRules?: string;
            mode?: string;
        }) => Promise<unknown>;
        status: () => Promise<{
            healthy: boolean;
            killSwitchEnabled: boolean;
        }>;
        getForTab: (tabId: string) => Promise<{
            proxy: {
                type: string;
                host: string;
                port: number;
            } | null;
        }>;
    };
    profiles: {
        create: (input: string | {
            name: string;
            proxy?: unknown;
            color?: string;
        }, proxy?: unknown) => Promise<unknown>;
        list: () => Promise<{
            id: string;
            name: string;
            createdAt: number;
            proxy?: unknown;
            kind?: "default" | "work" | "personal" | "custom";
            color?: string;
            system?: boolean;
            policy?: {
                allowDownloads: boolean;
                allowPrivateWindows: boolean;
                allowGhostTabs: boolean;
                allowScreenshots: boolean;
                allowClipping: boolean;
            };
            description?: string;
        }[]>;
        get: (id: string) => Promise<{
            id: string;
            name: string;
            createdAt: number;
            proxy?: unknown;
            kind?: "default" | "work" | "personal" | "custom";
            color?: string;
            system?: boolean;
            policy?: {
                allowDownloads: boolean;
                allowPrivateWindows: boolean;
                allowGhostTabs: boolean;
                allowScreenshots: boolean;
                allowClipping: boolean;
            };
            description?: string;
        }>;
        delete: (id: string) => Promise<unknown>;
        updateProxy: (profileId: string, proxy?: unknown) => Promise<unknown>;
        setActive: (profileId: string) => Promise<{
            id: string;
            name: string;
            color?: string;
            kind?: "default" | "work" | "personal" | "custom";
            system?: boolean;
            policy?: {
                allowDownloads: boolean;
                allowPrivateWindows: boolean;
                allowGhostTabs: boolean;
                allowScreenshots: boolean;
                allowClipping: boolean;
            };
            description?: string;
        }>;
        getActive: () => Promise<{
            id: string;
            name: string;
            color?: string;
            kind?: "default" | "work" | "personal" | "custom";
            system?: boolean;
            policy?: {
                allowDownloads: boolean;
                allowPrivateWindows: boolean;
                allowGhostTabs: boolean;
                allowScreenshots: boolean;
                allowClipping: boolean;
            };
            description?: string;
        }>;
        getPolicy: (profileId?: string) => Promise<{
            allowDownloads: boolean;
            allowPrivateWindows: boolean;
            allowGhostTabs: boolean;
            allowScreenshots: boolean;
            allowClipping: boolean;
        }>;
    };
    games: {
        createSandbox: (payload: {
            gameId: string;
            url: string;
            title?: string;
        }) => Promise<{
            sandboxId: string;
            partition?: string;
            url: string;
            hardened?: boolean;
            createdAt: number;
        }>;
        destroySandbox: (payload: {
            sandboxId: string;
        }) => Promise<{
            success: boolean;
            error?: string;
        }>;
        reportMetrics: (payload: {
            sandboxId: string;
            metrics: {
                fps?: number;
                droppedFrames?: number;
                memoryMb?: number;
                cpuPercent?: number;
            };
        }) => Promise<{
            success: boolean;
            error?: string;
        }>;
    };
    telemetry: {
        setOptIn: (optIn: boolean) => Promise<{
            success: boolean;
        } | {
            success: boolean;
        }>;
        getStatus: () => Promise<{
            optIn: boolean;
            enabled: boolean;
        } | {
            optIn: boolean;
            enabled: boolean;
        }>;
        getSummary: () => Promise<{
            optIn: boolean;
            enabled: boolean;
            crashCount: number;
            lastCrashAt: number | null;
            uptimeSeconds: number;
            perfMetrics: Array<{
                metric: string;
                samples: number;
                avg: number;
                p95: number;
                last: number;
                unit: string;
            }>;
        } | {
            optIn: boolean;
            enabled: boolean;
            crashCount: number;
            lastCrashAt: null;
            uptimeSeconds: number;
            perfMetrics: never[];
        }>;
        trackPerf: (metric: string, value: number, unit?: "ms" | "MB" | "%") => Promise<{
            success: boolean;
        }>;
        trackFeature: (feature: string, action?: string) => Promise<{
            success: boolean;
        }>;
    };
    analytics: {
        setOptIn: (optIn: boolean) => Promise<{
            success: boolean;
        } | {
            success: boolean;
        }>;
        getStatus: () => Promise<{
            optIn: boolean;
            enabled: boolean;
        } | {
            optIn: boolean;
            enabled: boolean;
        }>;
        track: (type: string, payload?: Record<string, unknown>) => Promise<{
            success: boolean;
        } | {
            success: boolean;
        }>;
    };
    settings: {
        get: () => Promise<unknown>;
        set: (path: string[], value: unknown) => Promise<unknown>;
        reset: () => Promise<{
            success: boolean;
            settings?: unknown;
        }>;
        getCategory: (category: string) => Promise<unknown>;
        setCategory: (category: string, values: Record<string, unknown>) => Promise<{
            success: boolean;
            settings?: unknown;
        }>;
        exportAll: () => Promise<{
            success: boolean;
            path?: string;
            canceled?: boolean;
        }>;
        importAll: () => Promise<{
            success: boolean;
            path?: string;
            settings?: unknown;
            canceled?: boolean;
        }>;
        exportFile: () => Promise<{
            success: boolean;
            path?: string;
            canceled?: boolean;
        }>;
        importFile: () => Promise<{
            success: boolean;
            path?: string;
            settings?: unknown;
            canceled?: boolean;
        }>;
    };
    diagnostics: {
        openLogs: () => Promise<{
            success: boolean;
        }>;
        copyDiagnostics: () => Promise<{
            diagnostics: string;
        }>;
    };
    agent: {
        createTask: (task: unknown) => Promise<unknown>;
        generatePlan: (taskId: string, observations?: unknown[]) => Promise<unknown>;
        executeTask: (taskId: string, confirmSteps?: string[]) => Promise<unknown>;
        cancelTask: (taskId: string) => Promise<unknown>;
        getStatus: (taskId: string) => Promise<unknown>;
        ask: (query: string, context?: {
            url?: string;
            text?: string;
        }) => Promise<{
            answer: string;
            sources?: string[];
        }>;
        askWithScrape: (payload: {
            url: string;
            question: string;
            task?: "summarize" | "qa" | "threat";
            waitFor?: number;
        }) => Promise<{
            jobId: string;
            task?: string;
            status?: "complete" | "enqueued";
            answer?: string;
            summary?: string;
            highlights?: string[];
            model?: string | {
                name?: string;
            };
            sources?: string[];
            scrape: {
                status: number;
                cached: boolean;
                fetchedAt?: string;
            };
        }>;
        deepResearch: (request: {
            query: string;
            maxSources?: number;
            outputFormat?: "json" | "csv" | "markdown";
            includeCitations?: boolean;
        }) => Promise<unknown>;
        stream: {
            start: (query: string, options?: {
                model?: string;
                temperature?: number;
                maxTokens?: number;
            }) => Promise<unknown>;
            stop: (streamId: string) => Promise<unknown>;
        };
        generatePlanFromGoal: (request: {
            goal: string;
            mode?: string;
            constraints?: string[];
        }) => Promise<Plan>;
        executePlan: (request: {
            planId: string;
            plan: Plan;
        }) => Promise<unknown>;
        guardrails: {
            config: (config: any) => Promise<unknown>;
            check: (type: "prompt" | "domain" | "ratelimit" | "step", data: any) => Promise<unknown>;
        };
    };
    cursor: {
        setApiKey: (payload: {
            apiKey: string;
        }) => Promise<{
            success: boolean;
        }>;
        checkApiKey: () => Promise<{
            hasKey: boolean;
            isAvailable: boolean;
        }>;
        query: (payload: {
            question: string;
            pageSnapshot?: {
                url: string;
                title: string;
                html?: string;
                text?: string;
            };
            editorState?: {
                filePath: string;
                content: string;
                language?: string;
                cursorLine?: number;
                cursorCol?: number;
            };
            useWebSocket?: boolean;
            systemInstructions?: string;
        }) => Promise<{
            jobId: string;
            answer?: string;
            status: "streaming" | "complete" | "error";
            error?: string;
        }>;
        clearHistory: () => Promise<{
            success: boolean;
        }>;
    };
    omnix: {
        browser: {
            getPage: () => Promise<{
                url: string;
                title: string;
                html?: string;
                text?: string;
            } | null>;
            getActiveTab: () => Promise<{
                id: string;
                url: string;
                title: string;
            } | null>;
            captureSnapshot: (payload: {
                url?: string;
            }) => Promise<{
                url: string;
                title: string;
                html: string;
                text: string;
            }>;
        };
        scrape: {
            fetch: (payload: {
                url: string;
                options?: {
                    timeout?: number;
                    cache?: boolean;
                };
            }) => Promise<{
                body: string;
                status: number;
                headers: Record<string, string>;
            }>;
            enqueue: (payload: {
                url: string;
            }) => Promise<{
                jobId: string;
            }>;
        };
        ai: {
            ask: (payload: {
                question: string;
                context?: {
                    url?: string;
                    text?: string;
                };
            }) => Promise<{
                answer: string;
                sources?: string[];
            }>;
            summarize: (payload: {
                url: string;
            }) => Promise<{
                summary: string;
                highlights: string[];
            }>;
        };
        trade: {
            getChart: (payload: {
                symbol: string;
            }) => Promise<{
                data: unknown;
            }>;
        };
        file: {
            save: (payload: {
                path: string;
                content: string;
            }) => Promise<{
                success: boolean;
            }>;
            read: (payload: {
                path: string;
            }) => Promise<{
                content: string;
            }>;
        };
        security: {
            scanPage: (payload: {
                url: string;
            }) => Promise<{
                threats: string[];
                score: number;
            }>;
        };
    };
    session: {
        saveTabs: () => Promise<{
            success: boolean;
            count: number;
        }>;
        loadTabs: () => Promise<{
            tabs: Array<{
                id: string;
                url: string;
                title: string;
                active: boolean;
                position: number;
            }>;
        }>;
        addHistory: (payload: {
            url: string;
            title: string;
            typed?: boolean;
        }) => Promise<{
            success: boolean;
        }>;
        getHistory: (payload: {
            limit?: number;
        }) => Promise<{
            history: Array<{
                id: string;
                url: string;
                title: string;
                visitCount: number;
                lastVisitAt: number;
            }>;
        }>;
        searchHistory: (payload: {
            query: string;
            limit?: number;
        }) => Promise<{
            results: Array<{
                id: string;
                url: string;
                title: string;
            }>;
        }>;
        saveSetting: (payload: {
            key: string;
            value: unknown;
        }) => Promise<{
            success: boolean;
        }>;
        getSetting: (payload: {
            key: string;
        }) => Promise<{
            value: unknown;
        }>;
        checkRestore: () => Promise<{
            available: boolean;
            snapshot?: {
                tabCount: number;
                mode: string;
                timestamp: number;
                activeTabId: string | null;
            };
        }>;
        getSnapshot: () => Promise<{
            version: number;
            tabs: Array<{
                id: string;
                url: string;
                title: string;
                active: boolean;
                mode?: string;
                containerId?: string;
            }>;
            mode: string;
            activeTabId: string | null;
            chromeOffsets?: {
                top: number;
                bottom: number;
                left: number;
                right: number;
            };
            rightDockPx?: number;
            timestamp: number;
        } | null>;
        dismissRestore: () => Promise<{
            success: boolean;
        }>;
    };
    researchStream: {
        start: (question: string, mode?: "default" | "threat" | "trade") => Promise<{
            jobId: string;
            channel: string;
        }>;
    };
    cloudVector: {
        config: (config: {
            provider: "qdrant" | "pinecone" | "none";
            endpoint?: string;
            apiKey?: string;
            collection?: string;
            enabled: boolean;
        }) => Promise<unknown>;
        sync: (documentIds?: string[]) => Promise<unknown>;
        search: (query: string, topK?: number) => Promise<unknown>;
        available: () => Promise<{
            available: boolean;
        }>;
    };
    hybridSearch: {
        search: (query: string, maxResults?: number, language?: string) => Promise<unknown>;
        config: (config: {
            sources?: {
                brave?: {
                    enabled: boolean;
                    apiKey?: string;
                };
                bing?: {
                    enabled: boolean;
                    apiKey?: string;
                    endpoint?: string;
                };
                custom?: {
                    enabled: boolean;
                };
            };
            maxResults?: number;
            rerank?: boolean;
        }) => Promise<unknown>;
    };
    liveSearch: {
        start: (query: string, options?: {
            mode?: "default" | "threat" | "trade";
            region?: string;
            maxResults?: number;
        }) => Promise<{
            jobId: string;
            channel: string;
        }>;
    };
    graph: {
        tabs: () => Promise<{
            nodes: Array<{
                id: string;
                title: string;
                url: string;
                domain: string;
                containerId?: string;
                containerName?: string;
                containerColor?: string;
                mode?: "normal" | "ghost" | "private";
                active: boolean;
                createdAt?: number;
                lastActiveAt?: number;
            }>;
            edges: Array<{
                id: string;
                source: string;
                target: string;
                weight: number;
                reasons: string[];
            }>;
            summary: {
                totalTabs: number;
                activeTabs: number;
                domains: number;
                containers: number;
            };
            updatedAt: number;
        }>;
        workflow: (options?: {
            maxSteps?: number;
        }) => Promise<{
            planId: string;
            goal: string;
            summary: string;
            generatedAt: number;
            confidence: number;
            steps: Array<{
                id: string;
                title: string;
                description: string;
                tabIds: string[];
                recommendedActions: string[];
                primaryDomain?: string;
                confidence?: number;
            }>;
            sources: Array<{
                domain: string;
                tabIds: string[];
            }>;
        }>;
    };
    efficiency: {
        applyMode: (mode: "normal" | "battery-saver" | "extreme") => Promise<{
            success: boolean;
        }>;
        clearOverride: () => Promise<{
            success: boolean;
        }>;
        hibernateInactiveTabs: () => Promise<{
            success: boolean;
            count: number;
        }>;
        ecoImpact: (options?: {
            horizonMinutes?: number;
        }) => Promise<EcoImpactForecast>;
    };
    browser: {
        launch: (url: string, headless?: boolean) => Promise<{
            success: boolean;
            title?: string;
            url?: string;
            screenshot?: string;
            error?: string;
        }>;
        regenLaunch: (url: string, mode: string) => Promise<string>;
        regenSession: (urls: string[]) => Promise<{
            success: boolean;
            title?: string;
            url?: string;
            screenshot?: string;
            error?: string;
        }[]>;
        captureScreenshot: (url: string) => Promise<{
            success: boolean;
            screenshot?: string;
            error?: string;
        }>;
    };
    grammar: {
        correct: (text: string) => Promise<string>;
    };
    vision: {
        captureScreen: () => Promise<string>;
        analyze: (prompt: string, screenshot?: string) => Promise<string>;
    };
    trust: {
        list: () => Promise<{
            records: TrustSummary[];
        }>;
        get: (domain: string) => Promise<{
            found: boolean;
            summary?: TrustSummary;
        }>;
        submit: (signal: {
            domain: string;
            url?: string;
            title?: string;
            score: number;
            confidence?: number;
            tags?: string[];
            comment?: string;
            sourcePeer?: string;
        }) => Promise<{
            summary: TrustSummary | null;
        }>;
    };
    downloads: {
        list: () => Promise<{
            id: string;
            url: string;
            filename?: string;
            status: string;
            progress?: number;
            receivedBytes?: number;
            totalBytes?: number;
            path?: string;
            checksum?: string;
            createdAt: number;
            speedBytesPerSec?: number;
            etaSeconds?: number;
            safety?: {
                status: string;
                threatLevel?: string;
                details?: string;
                recommendations?: string[];
                scannedAt?: number;
                quarantinePath?: string;
            };
        }[]>;
        openFile: (path: string) => Promise<unknown>;
        showInFolder: (path: string) => Promise<unknown>;
        requestConsent: (url: string, filename: string, size?: number) => Promise<unknown>;
        pause: (id: string) => Promise<unknown>;
        resume: (id: string) => Promise<unknown>;
        cancel: (id: string) => Promise<unknown>;
        retry: (id: string) => Promise<{
            success: boolean;
            queued?: boolean;
        }>;
        getQueue: () => Promise<{
            active: number;
            queued: number;
            maxConcurrent: number;
        }>;
    };
    watchers: {
        list: () => Promise<{
            id: string;
            url: string;
            createdAt: number;
            intervalMinutes: number;
            lastCheckedAt?: number;
            lastHash?: string;
            lastChangeAt?: number;
            status: string;
            error?: string;
        }[]>;
        add: (request: {
            url: string;
            intervalMinutes?: number;
        }) => Promise<{
            id: string;
            url: string;
            createdAt: number;
            intervalMinutes: number;
            status: string;
        }>;
        remove: (id: string) => Promise<{
            success: boolean;
        }>;
        trigger: (id: string) => Promise<{
            success: boolean;
            error?: string;
        }>;
        updateInterval: (id: string, intervalMinutes: number) => Promise<{
            success: boolean;
            error?: string;
        }>;
    };
    history: {
        list: () => Promise<any[]>;
        clear: () => Promise<unknown>;
        search: (query: string) => Promise<any[]>;
        deleteUrl: (url: string) => Promise<{
            success: boolean;
        }>;
    };
    storage: {
        saveWorkspace: (workspace: unknown) => Promise<unknown>;
        listWorkspaces: () => Promise<unknown[]>;
    };
    shields: {
        get: (url: string) => Promise<unknown>;
        set: (hostname: string, config: unknown) => Promise<unknown>;
        updateDefault: (config: unknown) => Promise<unknown>;
        list: () => Promise<unknown[]>;
        getStatus: () => Promise<{
            adsBlocked: number;
            trackersBlocked: number;
            httpsUpgrades: number;
            cookies3p: "block" | "allow";
            webrtcBlocked: boolean;
            fingerprinting: boolean;
        }>;
    };
    network: {
        get: () => Promise<{
            quicEnabled: boolean;
            ipv6Enabled: boolean;
            ipv6LeakProtection: boolean;
        }>;
        disableQUIC: () => Promise<unknown>;
        enableQUIC: () => Promise<unknown>;
        disableIPv6: () => Promise<unknown>;
        enableIPv6: () => Promise<unknown>;
    };
    ollama: {
        check: () => Promise<{
            available: boolean;
            models?: string[];
        }>;
        listModels: () => Promise<{
            models: string[];
        }>;
    };
    citation: {
        extract: (text: string, url?: string) => Promise<unknown>;
        get: () => Promise<{
            nodes: any[];
            edges: any[];
        }>;
        export: (format: "json" | "graphml") => Promise<unknown>;
        clear: () => Promise<unknown>;
    };
    knowledge: {
        cluster: (sources: Array<{
            url: string;
            title: string;
            text?: string;
        }>, threshold?: number) => Promise<unknown>;
        parsePDF: (filePath: string) => Promise<unknown>;
        clusterCompare: (cluster1Id: string, cluster2Id: string) => Promise<unknown>;
        clustersList: () => Promise<{
            clusters: any[];
        }>;
    };
    cognitive: {
        recordPattern: (pattern: {
            url: string;
            domain: string;
            timeSpent: number;
            actions: string[];
            topics?: string[];
        }) => Promise<unknown>;
        getSuggestions: (request?: {
            currentUrl?: string;
            recentActions?: string[];
        }) => Promise<unknown>;
        getPersona: () => Promise<{
            interests: string[];
            habits: string[];
            patterns: string;
        }>;
        getGraph: () => Promise<{
            graph: any;
        }>;
        clear: () => Promise<unknown>;
    };
    workspaceV2: {
        save: (workspace: {
            id: string;
            name: string;
            tabs: any[];
            notes?: Record<string, string>;
            proxyProfileId?: string;
            mode?: string;
            layout?: any;
        }) => Promise<unknown>;
        load: (workspaceId: string) => Promise<unknown>;
        list: () => Promise<{
            workspaces: any[];
        }>;
        delete: (workspaceId: string) => Promise<unknown>;
        updateNotes: (workspaceId: string, tabId: string, note: string) => Promise<unknown>;
        getNotes: (workspaceId: string) => Promise<{
            notes: Record<string, string>;
        }>;
    };
    sessionBundle: {
        export: (runId: string, options?: {
            name?: string;
            description?: string;
        }) => Promise<unknown>;
        import: (filePath: string) => Promise<unknown>;
        replay: (bundleId: string, options?: {
            restoreWorkspace?: boolean;
            replayAgent?: boolean;
        }) => Promise<unknown>;
        list: () => Promise<{
            bundles: any[];
        }>;
    };
    sessionState: {
        summary: () => Promise<{
            summary: {
                updatedAt: number;
                windowCount: number;
                tabCount: number;
            } | null;
        }>;
        restore: () => Promise<{
            restored: boolean;
            tabCount?: number;
            error?: string;
        }>;
    };
    historyGraph: {
        recordNavigation: (fromUrl: string | null, toUrl: string, title?: string) => Promise<unknown>;
        recordCitation: (sourceUrl: string, targetUrl: string) => Promise<unknown>;
        recordExport: (sourceUrl: string, exportType: string, filename: string) => Promise<unknown>;
        recordNote: (url: string, noteText: string) => Promise<unknown>;
        get: (options?: {
            startTime?: number;
            endTime?: number;
        }) => Promise<{
            graph: any;
        }>;
        export: (format: "json" | "graphml") => Promise<unknown>;
        clear: () => Promise<unknown>;
    };
    omniscript: {
        parse: (command: string) => Promise<{
            parsed: any;
        }>;
        execute: (commands: string[]) => Promise<{
            actions: any[];
        }>;
    };
    omniBrain: {
        addDocument: (document: {
            text: string;
            url?: string;
            metadata?: Record<string, unknown>;
        }) => Promise<{
            id: string;
        }>;
        search: (query: string, limit?: number) => Promise<{
            document: any;
            similarity: number;
        }[]>;
        getDocument: (id: string) => Promise<{
            document: any;
        }>;
        listDocuments: () => Promise<{
            documents: any[];
        }>;
        deleteDocument: (id: string) => Promise<unknown>;
        clear: () => Promise<unknown>;
    };
    spiritual: {
        focusMode: {
            enable: (config?: {
                ambientSound?: "none" | "nature" | "rain" | "ocean" | "meditation";
                breathingOverlay?: boolean;
                timer?: number;
                notifications?: boolean;
            }) => Promise<unknown>;
            disable: () => Promise<unknown>;
            status: () => Promise<{
                active: boolean;
                config: any;
            }>;
        };
        mood: {
            recordTyping: () => Promise<unknown>;
            get: () => Promise<{
                mood: string;
                confidence: number;
                detectedAt: number;
                colors: any;
            }>;
            reset: () => Promise<unknown>;
        };
        balance: {
            start: (intervals?: {
                rest?: number;
                stretch?: number;
                hydrate?: number;
                eyeBreak?: number;
            }) => Promise<unknown>;
            stop: () => Promise<unknown>;
        };
    };
    pluginMarketplace: {
        list: () => Promise<{
            plugins: any[];
        }>;
        install: (pluginId: string, verifySignature?: boolean) => Promise<unknown>;
        uninstall: (pluginId: string) => Promise<unknown>;
        installed: () => Promise<{
            plugins: string[];
        }>;
        isInstalled: (pluginId: string) => Promise<{
            installed: boolean;
        }>;
    };
    extensionNexus: {
        list: () => Promise<NexusListResponse>;
        publish: (metadata: {
            pluginId: string;
            name: string;
            version: string;
            description: string;
            author: string;
            sourcePeer: string;
            carbonScore?: number;
            tags?: string[];
        }) => Promise<NexusPluginEntry>;
        trust: (pluginId: string, trusted: boolean) => Promise<{
            plugin: NexusPluginEntry | null;
        }>;
    };
    performance: {
        battery: {
            update: (payload: {
                level?: number | null;
                charging?: boolean | null;
                chargingTime?: number | null;
                dischargingTime?: number | null;
                carbonIntensity?: number | null;
                regionCode?: string | null;
            }) => Promise<unknown>;
        };
        getMetrics: () => Promise<{
            cpu: number;
            memory: number;
            cpuLoad1: number;
            ramMb: number;
            activeTabs: number;
            timestamp: number;
        }>;
        gpu: {
            enableRaster: () => Promise<{
                success: boolean;
                config: any;
            }>;
            disableRaster: () => Promise<{
                success: boolean;
                config: any;
            }>;
            enableHardwareDecode: () => Promise<{
                success: boolean;
                config: any;
            }>;
            disableHardwareDecode: () => Promise<{
                success: boolean;
                config: any;
            }>;
            getConfig: () => Promise<{
                config: any;
            }>;
        };
        snapshot: {
            create: (snapshot: {
                windows: any[];
                workspace?: string;
            }) => Promise<{
                snapshotId: string;
            }>;
            restore: (snapshotId: string) => Promise<{
                snapshot: any;
            }>;
            latest: () => Promise<{
                snapshot: any;
            }>;
            list: () => Promise<{
                snapshots: any[];
            }>;
        };
    };
    workers: {
        scraping: {
            run: (task: {
                id: string;
                urls: string[];
                selectors?: string[];
                pagination?: any;
            }) => Promise<{
                taskId: string;
                results: any[];
                completed: number;
                total: number;
            }>;
        };
    };
    videoCall: {
        getConfig: () => Promise<{
            enabled: boolean;
            adaptiveQuality: boolean;
            maxResolution: string;
            maxFrameRate: number;
            bandwidthEstimate: number;
            priorityMode: string;
        }>;
        updateConfig: (config: {
            enabled?: boolean;
            adaptiveQuality?: boolean;
            maxResolution?: "720p" | "480p" | "360p" | "240p";
            maxFrameRate?: number;
            bandwidthEstimate?: number;
            priorityMode?: "performance" | "balanced" | "quality";
        }) => Promise<unknown>;
        getNetworkQuality: () => Promise<{
            bandwidth: number;
            latency: number;
            packetLoss: number;
            quality: string;
        }>;
        updateNetworkQuality: (quality: {
            bandwidth: number;
            latency?: number;
            packetLoss?: number;
        }) => Promise<unknown>;
    };
    sessions: {
        create: (request: {
            name: string;
            profileId?: string;
            color?: string;
        }) => Promise<{
            id: string;
            name: string;
            profileId: string;
            createdAt: number;
            tabCount: number;
            color?: string;
        }>;
        list: () => Promise<{
            id: string;
            name: string;
            profileId: string;
            createdAt: number;
            tabCount: number;
            color?: string;
        }[]>;
        getActive: () => Promise<{
            id: string;
            name: string;
            profileId: string;
            createdAt: number;
            tabCount: number;
            color?: string;
        } | null>;
        setActive: (request: {
            sessionId: string;
        }) => Promise<unknown>;
        get: (request: {
            sessionId: string;
        }) => Promise<{
            id: string;
            name: string;
            profileId: string;
            createdAt: number;
            tabCount: number;
            color?: string;
        }>;
        delete: (request: {
            sessionId: string;
        }) => Promise<unknown>;
        update: (request: {
            sessionId: string;
            name?: string;
            color?: string;
        }) => Promise<unknown>;
        getPartition: (request: {
            sessionId: string;
        }) => Promise<{
            partition: string;
        }>;
    };
    private: {
        createWindow: (options?: {
            url?: string;
            autoCloseAfter?: number;
            contentProtection?: boolean;
            ghostMode?: boolean;
        }) => Promise<{
            windowId: number;
        }>;
        createGhostTab: (options?: {
            url?: string;
        }) => Promise<{
            tabId: string;
        }>;
        closeAll: () => Promise<{
            count: number;
        }>;
        panicWipe: (options?: {
            forensic?: boolean;
        }) => Promise<{
            success: boolean;
        }>;
    };
    crossReality: {
        handoff: (tabId: string, target: "mobile" | "xr") => Promise<{
            success: boolean;
            handoff: any;
        }>;
        queue: () => Promise<{
            handoffs: any[];
        }>;
        sendHandoffStatus: (status: {
            platform: string;
            lastSentAt: number | null;
        }) => Promise<{
            success: boolean;
        } | {
            success: boolean;
        }>;
    };
    identity: {
        status: () => Promise<IdentityVaultSummary>;
        unlock: (passphrase: string) => Promise<IdentityVaultSummary>;
        lock: () => Promise<IdentityVaultSummary>;
        list: () => Promise<IdentityCredential[]>;
        add: (payload: {
            domain: string;
            username: string;
            secret: string;
            secretHint?: string | null;
            tags?: string[];
        }) => Promise<IdentityCredential>;
        remove: (id: string) => Promise<{
            success: boolean;
        }>;
        reveal: (id: string) => Promise<IdentityRevealPayload>;
    };
    consent: {
        createRequest: (action: ConsentAction) => Promise<{
            consentId: string;
        }>;
        approve: (consentId: string) => Promise<{
            success: boolean;
            consent?: ConsentRecord | null;
            receipt?: {
                receiptId: string;
                proof: string;
            };
        }>;
        revoke: (consentId: string) => Promise<{
            success: boolean;
        }>;
        check: (action: ConsentAction) => Promise<{
            hasConsent: boolean;
        }>;
        get: (consentId: string) => Promise<ConsentRecord | undefined>;
        list: (filter?: {
            type?: ConsentAction["type"];
            approved?: boolean;
        }) => Promise<ConsentRecord[]>;
        export: () => Promise<string>;
        vault: {
            export: () => Promise<ConsentVaultSnapshot>;
        };
    };
    research: {
        queryEnhanced: (payload: {
            query: string;
            maxSources?: number;
            includeCounterpoints?: boolean;
            recencyWeight?: number;
            authorityWeight?: number;
            language?: string;
        }) => Promise<any>;
        extractContent: (tabId?: string) => Promise<{
            content: string;
            title: string;
            html: string;
        }>;
        saveNotes: (url: string, notes: string, highlights?: unknown[]) => Promise<{
            success: boolean;
        }>;
        getNotes: (url: string) => Promise<{
            notes: string;
            highlights: unknown[];
        }>;
        export: (payload: {
            format: "markdown" | "obsidian" | "notion";
            sources: string[];
            includeNotes?: boolean;
        }) => Promise<any>;
        saveSnapshot: (tabId: string) => Promise<{
            snapshotId: string;
            url: string;
        }>;
        uploadFile: (file: File) => Promise<string>;
        listDocuments: () => Promise<{
            documents: Array<{
                id: string;
                type: string;
                title: string;
                uploadedAt: number;
                chunkCount: number;
            }>;
        }>;
        getDocumentChunks: (documentId: string) => Promise<{
            chunks: Array<{
                id: string;
                content: string;
                metadata: any;
            }>;
        }>;
        capturePage: (tabId?: string) => Promise<{
            snapshotId: string;
            url: string;
            title: string;
            dimensions: {
                width: number;
                height: number;
            };
        }>;
        captureSelection: (text?: string, tabId?: string) => Promise<{
            clipId: string;
            url: string;
            text: string;
        }>;
    };
    reader: {
        summarize: (payload: {
            url?: string;
            title?: string;
            content: string;
            html?: string;
        }) => Promise<any>;
        export: (payload: {
            url?: string;
            title?: string;
            html: string;
        }) => Promise<{
            success: boolean;
            path: string;
        }>;
    };
    trade: {
        execute: (query: string) => Promise<string>;
        tradingviewAuthorize: (login: string, password: string) => Promise<{
            s: string;
            d: {
                access_token: string;
                expiration: number;
            };
        }>;
        tradingviewQuotes: (accountId: string, symbols: string) => Promise<{
            s: string;
            d: Array<any>;
        }>;
        tradingviewPlaceOrder: (params: {
            accountId: string;
            instrument: string;
            qty: number;
            side: "buy" | "sell";
            orderType: "market" | "limit" | "stop" | "stoplimit";
            limitPrice?: number;
            stopPrice?: number;
            currentAsk: number;
            currentBid: number;
            stopLoss?: number;
            takeProfit?: number;
        }) => Promise<{
            s: string;
            d: {
                orderId: string;
                transactionId?: string;
            };
        }>;
        tradingviewGetPositions: (accountId: string) => Promise<{
            s: string;
            d: Array<any>;
        }>;
        tradingviewGetAccountState: (accountId: string) => Promise<{
            s: string;
            d: {
                balance: number;
                unrealizedPl: number;
                equity: number;
            };
        }>;
        placeOrder: (order: {
            symbol: string;
            side: "buy" | "sell";
            quantity: number;
            orderType: "market" | "limit" | "stop" | "stop_limit";
            limitPrice?: number;
            stopPrice?: number;
            timeInForce?: "day" | "gtc" | "ioc" | "fok";
            bracket?: {
                stopLoss: number;
                takeProfit: number;
                stopLossType?: "price" | "percent" | "atr";
                takeProfitType?: "price" | "percent" | "atr";
            };
            trailingStop?: {
                distance: number;
                distanceType: "price" | "percent" | "atr";
                activationPrice?: number;
            };
            paper?: boolean;
            aiSignalId?: string;
        }) => Promise<{
            orderId: string;
        }>;
        cancelOrder: (orderId: string) => Promise<{
            success: boolean;
        }>;
        getOrders: (status?: string) => Promise<{
            orders: Array<{
                id: string;
                symbol: string;
                side: "buy" | "sell";
                quantity: number;
                filledQuantity: number;
                orderType: string;
                status: string;
                limitPrice?: number;
                stopPrice?: number;
                averageFillPrice?: number;
                createdAt: number;
                filledAt?: number;
                paper: boolean;
            }>;
        }>;
        getPositions: () => Promise<{
            positions: Array<{
                id: string;
                symbol: string;
                quantity: number;
                averageEntryPrice: number;
                currentPrice: number;
                unrealizedPnL: number;
                realizedPnL: number;
                entryOrderId: string;
                paper: boolean;
            }>;
        }>;
        closePosition: (symbol: string, quantity?: number) => Promise<{
            success: boolean;
            orderId?: string;
            error?: string;
        }>;
        getBalance: () => Promise<{
            cash: number;
            buyingPower: number;
            portfolioValue: number;
        }>;
        connectBroker: (config: {
            brokerId: string;
            apiKey: string;
            apiSecret: string;
            paper: boolean;
        }) => Promise<{
            success: boolean;
        }>;
        getQuote: (symbol: string) => Promise<{
            symbol: string;
            bid: number;
            ask: number;
            last: number;
            volume: number;
            timestamp: number;
        }>;
        getCandles: (params: {
            symbol: string;
            timeframe: string;
            from: number;
            to: number;
        }) => Promise<{
            candles: Array<{
                time: number;
                open: number;
                high: number;
                low: number;
                close: number;
                volume: number;
            }>;
        }>;
    };
    dns: {
        status: () => Promise<{
            enabled: boolean;
            provider: "cloudflare" | "quad9";
        }>;
        enableDoH: (provider?: "cloudflare" | "quad9") => Promise<unknown>;
        disableDoH: () => Promise<unknown>;
    };
    privacy: {
        sentinel: {
            audit: (tabId?: string | null) => Promise<PrivacyAuditSummary>;
        };
        getStats: () => Promise<{
            trackersBlocked: number;
            adsBlocked: number;
            cookiesBlocked: number;
            scriptsBlocked: number;
            httpsUpgrades: number;
            fingerprintingEnabled: boolean;
            webrtcBlocked: boolean;
            totalCookies: number;
            totalOrigins: number;
            privacyScore: number;
        }>;
        getTrackers: (limit?: number) => Promise<{
            domain: string;
            category: string;
            count: number;
            blocked: boolean;
            lastSeen: number;
        }[]>;
        exportReport: (format?: "json" | "csv") => Promise<{
            stats: any;
            trackers: any[];
            origins: any[];
            timestamp: number;
            exportFormat: "json" | "csv";
        }>;
    };
    redix: {
        ask: (prompt: string, options?: {
            sessionId?: string;
            stream?: boolean;
        }) => Promise<{
            success: boolean;
            response?: string;
            tokens?: number;
            cached?: boolean;
            ready?: boolean;
            error?: string;
            streaming?: boolean;
        }>;
        status: () => Promise<{
            success: boolean;
            ready: boolean;
            backend: string;
            message: string;
            error?: string;
        }>;
        stream: (prompt: string, options?: {
            sessionId?: string;
        }, onChunk?: (chunk: {
            type: string;
            text?: string;
            tokens?: number;
            done?: boolean;
            error?: string;
        }) => void) => Promise<{
            success: boolean;
            error?: string;
        }>;
    };
    system: {
        getStatus: () => Promise<{
            redisConnected: boolean;
            redixAvailable: boolean;
            workerState: "running" | "stopped" | "error";
            vpn: {
                connected: boolean;
                profile?: string;
                type?: string;
            };
            tor: {
                running: boolean;
                bootstrapped: boolean;
            };
            mode: string;
            uptime: number;
            memoryUsage: {
                heapUsed: number;
                heapTotal: number;
                external: number;
                rss: number;
            };
        }>;
    };
    gpu: {
        getStatus: () => Promise<{
            enabled: boolean;
        }>;
        setEnabled: (payload: {
            enabled: boolean;
        }) => Promise<{
            success: boolean;
            enabled: boolean;
            requiresRestart: boolean;
        }>;
    };
    features: {
        list: () => Promise<{
            flags: Array<{
                name: string;
                enabled: boolean;
                description?: string;
            }>;
        }>;
        get: (payload: {
            name: string;
        }) => Promise<{
            enabled: boolean;
        }>;
        set: (payload: {
            name: string;
            enabled: boolean;
        }) => Promise<{
            success: boolean;
        }>;
    };
    regen: {
        query: (payload: {
            sessionId: string;
            message: string;
            mode?: "research" | "trade" | "browser" | "automation" | "handsFree";
            source?: "text" | "voice";
            tabId?: string;
            context?: {
                url?: string;
                title?: string;
                dom?: string;
            };
        }) => Promise<{
            intent: string;
            text: string;
            commands?: Array<{
                type: string;
                payload: Record<string, unknown>;
            }>;
            metadata?: Record<string, unknown>;
        }>;
        getDom: (payload: {
            tabId: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        clickElement: (payload: {
            tabId: string;
            selector: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        scroll: (payload: {
            tabId: string;
            amount: number;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        openTab: (payload: {
            url: string;
            background?: boolean;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        typeIntoElement: (payload: {
            tabId: string;
            selector: string;
            text: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        goBack: (payload: {
            tabId: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        goForward: (payload: {
            tabId: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        switchTab: (payload: {
            index?: number;
            id?: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        closeTab: (payload: {
            tabId: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        readPage: (payload: {
            tabId: string;
        }) => Promise<{
            success: boolean;
            data?: unknown;
            error?: string;
        }>;
        tradeConfirm: (payload: {
            orderId?: string;
            confirmed: boolean;
            pendingOrder: {
                type: "buy" | "sell";
                symbol: string;
                quantity: number;
                orderType?: "market" | "limit";
                price?: number;
            };
        }) => Promise<{
            success: boolean;
            orderId?: string;
            cancelled?: boolean;
            message?: string;
            error?: string;
        }>;
    };
};
type ConsentVaultEntry = {
    consentId: string;
    actionType: ConsentAction['type'];
    approved: boolean;
    timestamp: number;
    signature: string;
    chainHash: string;
    metadata: Record<string, unknown>;
};
type ConsentVaultSnapshot = {
    entries: ConsentVaultEntry[];
    anchor: string;
    updatedAt: number;
};
export {};
