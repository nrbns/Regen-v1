/**
 * HTTP API Client for Regen
 *
 * This replaces Electron IPC with HTTP calls to the Fastify backend.
 * Used during Electron → Tauri migration and web fallback.
 */
export declare const tabsApi: {
    list: () => Promise<any[]>;
    create: (payload: {
        url: string;
        profileId?: string;
    }) => Promise<{
        id: string;
    }>;
    close: (id: string) => Promise<{
        success: boolean;
    }>;
    activate: (id: string) => Promise<{
        success: boolean;
    }>;
    navigate: (payload: {
        id: string;
        url: string;
    }) => Promise<{
        success: boolean;
    }>;
    goBack: (id: string) => Promise<{
        success: boolean;
    }>;
    goForward: (id: string) => Promise<{
        success: boolean;
    }>;
    reload: (id: string, options?: {
        hard?: boolean;
    }) => Promise<{
        success: boolean;
    }>;
    stop: (id: string) => Promise<{
        success: boolean;
    }>;
    createWithProfile: (payload: {
        accountId: string;
        url: string;
    }) => Promise<{
        id: string;
    }>;
    overlayStart: () => Promise<{
        success: boolean;
    }>;
    overlayGetPick: () => Promise<any>;
    overlayClear: () => Promise<{
        success: boolean;
    }>;
    predictiveGroups: () => Promise<{
        groups: any[];
        prefetch: any[];
        summary?: any;
    }>;
};
export declare const sessionsApi: {
    list: () => Promise<any[]>;
    create: (payload: {
        name: string;
        profileId?: string;
        color?: string;
    }) => Promise<{
        id: string;
    }>;
    getActive: () => Promise<{
        id: string;
    } | null>;
    setActive: (sessionId: string) => Promise<{
        success: boolean;
    }>;
    get: (sessionId: string) => Promise<any>;
    delete: (sessionId: string) => Promise<{
        success: boolean;
    }>;
    update: (payload: {
        sessionId: string;
        name?: string;
        color?: string;
    }) => Promise<{
        success: boolean;
    }>;
    getPartition: (sessionId: string) => Promise<{
        partition: string;
    }>;
};
export declare const agentApi: {
    start: (dsl: any) => Promise<{
        id: string;
    }>;
    status: (id: string) => Promise<any>;
    runs: () => Promise<any[]>;
    executeSkill: (payload: {
        skill: string;
        args: any;
    }) => Promise<any>;
    ask: (payload: {
        prompt: string;
        sessionId?: string;
        stream?: boolean;
    }) => Promise<{
        response: string;
    }>;
    query: (payload: {
        query: string;
        mode?: string;
    }) => Promise<any>;
};
export declare const systemApi: {
    getStatus: () => Promise<{
        cpu: number;
        memory: number;
        disk?: any;
    }>;
    ping: () => Promise<string>;
};
export declare const profilesApi: {
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    getActive: () => Promise<any>;
    getPolicy: (id: string) => Promise<any>;
    updateProxy: (payload: {
        id: string;
        proxy: any;
    }) => Promise<{
        success: boolean;
    }>;
    delete: (id: string) => Promise<{
        success: boolean;
    }>;
};
export declare const storageApi: {
    getSetting: (key: string) => Promise<any>;
    listWorkspaces: () => Promise<any[]>;
    listDownloads: () => Promise<any[]>;
    listAccounts: () => Promise<any[]>;
};
export declare const historyApi: {
    list: (limit?: number) => Promise<any[]>;
};
export declare const researchApi: {
    query: (query: string) => Promise<any>;
    queryEnhanced: (payload: {
        query: string;
        maxSources?: number;
        includeCounterpoints?: boolean;
        recencyWeight?: number;
        authorityWeight?: number;
        language?: string;
    }) => Promise<any>;
    run: (payload: {
        query: string;
        lang?: string;
        mode?: "fast" | "deep" | "crawl";
        maxSources?: number;
        clientId?: string;
        sessionId?: string;
        options?: {
            maxChunks?: number;
            model?: string;
        };
    }) => Promise<{
        jobId: string;
        status: string;
        estimatedWait?: number;
    }>;
    getStatus: (jobId: string) => Promise<{
        id: string;
        state: string;
        progress: number;
        result: any;
        error: string | null;
    }>;
};
export declare const graphApi: {
    add: (node: any, edges?: any[]) => Promise<{
        success: boolean;
    }>;
    get: (key: string) => Promise<any>;
    all: () => Promise<{
        nodes: any[];
        edges: any[];
    }>;
};
export declare const tradeApi: {
    getQuote: (symbol: string) => Promise<any>;
    getCandles: (symbol: string, interval?: string, limit?: number) => Promise<{
        symbol: string;
        interval: string;
        candles: any[];
    }>;
    placeOrder: (order: {
        symbol: string;
        quantity: number;
        orderType: "buy" | "sell";
        stopLoss?: number;
        takeProfit?: number;
    }) => Promise<{
        success: boolean;
        orderId: string;
    }>;
};
export declare const ledgerApi: {
    add: (payload: {
        url: string;
        passage: string;
    }) => Promise<{
        success: boolean;
    }>;
    verify: () => Promise<any>;
};
export declare const recorderApi: {
    start: () => Promise<{
        success: boolean;
    }>;
    getDsl: () => Promise<any>;
};
export declare const proxyApi: {
    set: (rules: any) => Promise<{
        success: boolean;
    }>;
    status: () => Promise<{
        healthy: boolean;
        killSwitchEnabled: boolean;
    }>;
    killSwitch: (enabled: boolean) => Promise<{
        success: boolean;
    }>;
};
export declare const threatsApi: {
    scanUrl: (url: string) => Promise<any>;
    scanFile: (filePath: string) => Promise<any>;
};
export declare const videoApi: {
    start: (args: any) => Promise<{
        id: string;
    }>;
    cancel: (id: string) => Promise<{
        success: boolean;
    }>;
    consent: {
        get: () => Promise<boolean>;
        set: (value: boolean) => Promise<{
            success: boolean;
        }>;
    };
};
export declare const uiApi: {
    setRightDock: (px: number) => Promise<{
        success: boolean;
    }>;
    setChromeOffsets: (offsets: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    }) => Promise<{
        success: boolean;
    }>;
};
export declare const scrapeApi: {
    enqueue: (task: any) => Promise<{
        id: string;
    }>;
    get: (id: string) => Promise<any>;
};
export declare const summarizeApi: {
    summarize: (payload: {
        url?: string;
        text?: string;
        question?: string;
        maxWaitSeconds?: number;
    }) => Promise<{
        summary: string;
        answer?: string;
        highlights?: string[];
        model: string;
        jobId: string;
        sources: Array<{
            url: string;
            jobId: string;
            selector: string | null;
        }>;
        provenance: any;
    }>;
};
export declare const sessionStateApi: {
    checkRestore: () => Promise<{
        available: boolean;
        snapshot?: any;
    }>;
    getSnapshot: () => Promise<any>;
    dismissRestore: () => Promise<{
        success: boolean;
    }>;
    saveTabs: () => Promise<{
        success: boolean;
        count: number;
    }>;
    loadTabs: () => Promise<{
        tabs: any[];
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
        history: any[];
    }>;
    searchHistory: (payload: {
        query: string;
        limit?: number;
    }) => Promise<{
        results: any[];
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
};
declare const _default: {
    tabs: {
        list: () => Promise<any[]>;
        create: (payload: {
            url: string;
            profileId?: string;
        }) => Promise<{
            id: string;
        }>;
        close: (id: string) => Promise<{
            success: boolean;
        }>;
        activate: (id: string) => Promise<{
            success: boolean;
        }>;
        navigate: (payload: {
            id: string;
            url: string;
        }) => Promise<{
            success: boolean;
        }>;
        goBack: (id: string) => Promise<{
            success: boolean;
        }>;
        goForward: (id: string) => Promise<{
            success: boolean;
        }>;
        reload: (id: string, options?: {
            hard?: boolean;
        }) => Promise<{
            success: boolean;
        }>;
        stop: (id: string) => Promise<{
            success: boolean;
        }>;
        createWithProfile: (payload: {
            accountId: string;
            url: string;
        }) => Promise<{
            id: string;
        }>;
        overlayStart: () => Promise<{
            success: boolean;
        }>;
        overlayGetPick: () => Promise<any>;
        overlayClear: () => Promise<{
            success: boolean;
        }>;
        predictiveGroups: () => Promise<{
            groups: any[];
            prefetch: any[];
            summary?: any;
        }>;
    };
    sessions: {
        list: () => Promise<any[]>;
        create: (payload: {
            name: string;
            profileId?: string;
            color?: string;
        }) => Promise<{
            id: string;
        }>;
        getActive: () => Promise<{
            id: string;
        } | null>;
        setActive: (sessionId: string) => Promise<{
            success: boolean;
        }>;
        get: (sessionId: string) => Promise<any>;
        delete: (sessionId: string) => Promise<{
            success: boolean;
        }>;
        update: (payload: {
            sessionId: string;
            name?: string;
            color?: string;
        }) => Promise<{
            success: boolean;
        }>;
        getPartition: (sessionId: string) => Promise<{
            partition: string;
        }>;
    };
    agent: {
        start: (dsl: any) => Promise<{
            id: string;
        }>;
        status: (id: string) => Promise<any>;
        runs: () => Promise<any[]>;
        executeSkill: (payload: {
            skill: string;
            args: any;
        }) => Promise<any>;
        ask: (payload: {
            prompt: string;
            sessionId?: string;
            stream?: boolean;
        }) => Promise<{
            response: string;
        }>;
        query: (payload: {
            query: string;
            mode?: string;
        }) => Promise<any>;
    };
    system: {
        getStatus: () => Promise<{
            cpu: number;
            memory: number;
            disk?: any;
        }>;
        ping: () => Promise<string>;
    };
    profiles: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        getActive: () => Promise<any>;
        getPolicy: (id: string) => Promise<any>;
        updateProxy: (payload: {
            id: string;
            proxy: any;
        }) => Promise<{
            success: boolean;
        }>;
        delete: (id: string) => Promise<{
            success: boolean;
        }>;
    };
    storage: {
        getSetting: (key: string) => Promise<any>;
        listWorkspaces: () => Promise<any[]>;
        listDownloads: () => Promise<any[]>;
        listAccounts: () => Promise<any[]>;
    };
    history: {
        list: (limit?: number) => Promise<any[]>;
    };
    research: {
        query: (query: string) => Promise<any>;
        queryEnhanced: (payload: {
            query: string;
            maxSources?: number;
            includeCounterpoints?: boolean;
            recencyWeight?: number;
            authorityWeight?: number;
            language?: string;
        }) => Promise<any>;
        run: (payload: {
            query: string;
            lang?: string;
            mode?: "fast" | "deep" | "crawl";
            maxSources?: number;
            clientId?: string;
            sessionId?: string;
            options?: {
                maxChunks?: number;
                model?: string;
            };
        }) => Promise<{
            jobId: string;
            status: string;
            estimatedWait?: number;
        }>;
        getStatus: (jobId: string) => Promise<{
            id: string;
            state: string;
            progress: number;
            result: any;
            error: string | null;
        }>;
    };
    graph: {
        add: (node: any, edges?: any[]) => Promise<{
            success: boolean;
        }>;
        get: (key: string) => Promise<any>;
        all: () => Promise<{
            nodes: any[];
            edges: any[];
        }>;
    };
    ledger: {
        add: (payload: {
            url: string;
            passage: string;
        }) => Promise<{
            success: boolean;
        }>;
        verify: () => Promise<any>;
    };
    recorder: {
        start: () => Promise<{
            success: boolean;
        }>;
        getDsl: () => Promise<any>;
    };
    proxy: {
        set: (rules: any) => Promise<{
            success: boolean;
        }>;
        status: () => Promise<{
            healthy: boolean;
            killSwitchEnabled: boolean;
        }>;
        killSwitch: (enabled: boolean) => Promise<{
            success: boolean;
        }>;
    };
    threats: {
        scanUrl: (url: string) => Promise<any>;
        scanFile: (filePath: string) => Promise<any>;
    };
    video: {
        start: (args: any) => Promise<{
            id: string;
        }>;
        cancel: (id: string) => Promise<{
            success: boolean;
        }>;
        consent: {
            get: () => Promise<boolean>;
            set: (value: boolean) => Promise<{
                success: boolean;
            }>;
        };
    };
    ui: {
        setRightDock: (px: number) => Promise<{
            success: boolean;
        }>;
        setChromeOffsets: (offsets: {
            top?: number;
            bottom?: number;
            left?: number;
            right?: number;
        }) => Promise<{
            success: boolean;
        }>;
    };
    scrape: {
        enqueue: (task: any) => Promise<{
            id: string;
        }>;
        get: (id: string) => Promise<any>;
    };
    summarize: {
        summarize: (payload: {
            url?: string;
            text?: string;
            question?: string;
            maxWaitSeconds?: number;
        }) => Promise<{
            summary: string;
            answer?: string;
            highlights?: string[];
            model: string;
            jobId: string;
            sources: Array<{
                url: string;
                jobId: string;
                selector: string | null;
            }>;
            provenance: any;
        }>;
    };
    session: {
        checkRestore: () => Promise<{
            available: boolean;
            snapshot?: any;
        }>;
        getSnapshot: () => Promise<any>;
        dismissRestore: () => Promise<{
            success: boolean;
        }>;
        saveTabs: () => Promise<{
            success: boolean;
            count: number;
        }>;
        loadTabs: () => Promise<{
            tabs: any[];
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
            history: any[];
        }>;
        searchHistory: (payload: {
            query: string;
            limit?: number;
        }) => Promise<{
            results: any[];
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
    };
};
export default _default;
