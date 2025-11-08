/**
 * Typed IPC Schema Definitions (Zod)
 * Version: v1
 * All IPC channels use the prefix: ob://ipc/v1/
 */

import { z } from 'zod';

// Base IPC request/response wrapper
export const IPCMessage = z.object({
  version: z.literal('v1'),
  channel: z.string(),
  payload: z.unknown(),
  requestId: z.string().optional(),
});

export const IPCResponse = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

// Tab schemas
export const TabCreateRequest = z.object({
  url: z.string().url().or(z.literal('about:blank')).optional().default('about:blank'),
  profileId: z.string().optional(),
  containerId: z.string().optional(),
});

export const TabCreateResponse = z.object({
  id: z.string(),
});

export const TabCreateWithProfileRequest = z.object({
  url: z.string().url().or(z.literal('about:blank')).optional().default('about:blank'),
  accountId: z.string(),
});

export const TabCloseRequest = z.object({
  id: z.string(),
});

export const TabActivateRequest = z.object({
  id: z.string(),
});

export const TabNavigateRequest = z.object({
  id: z.string().or(z.literal('active')),
  url: z.string().url(),
});

export const TabGoBackRequest = z.object({
  id: z.string(),
});

export const TabGoBackResponse = z.object({
  success: z.boolean(),
});

export const TabGoForwardRequest = z.object({
  id: z.string(),
});

export const TabGoForwardResponse = z.object({
  success: z.boolean(),
});

export const TabReloadRequest = z.object({
  id: z.string(),
});

export const TabReloadResponse = z.object({
  success: z.boolean(),
});

export const TabListResponse = z.array(z.object({
  id: z.string(),
  title: z.string(),
  active: z.boolean(),
  url: z.string().optional(),
  mode: z.enum(['normal', 'ghost', 'private']).optional(),
  containerId: z.string().optional(),
  containerName: z.string().optional(),
  containerColor: z.string().optional(),
}));
// Container schemas
export const ContainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string().optional(),
  partition: z.string(),
  createdAt: z.number(),
});

export const ContainerListResponse = z.array(ContainerSchema);

export const ContainerCreateRequest = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const ContainerSetActiveRequest = z.object({
  containerId: z.string(),
});


export const TabInfo = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  active: z.boolean(),
});

// Proxy schemas
export const ProxySetRequest = z.object({
  type: z.enum(['socks5', 'http']).optional(),
  host: z.string().optional(),
  port: z.number().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  tabId: z.string().optional(), // Per-tab proxy
  profileId: z.string().optional(), // Profile-level proxy
  proxyRules: z.string().optional(), // Legacy format
  mode: z.string().optional(),
}).refine((data) => {
  // Either use legacy proxyRules/mode OR use typed fields
  return (data.proxyRules || data.mode) || (data.type && data.host && data.port);
}, 'Must provide either proxyRules/mode or type/host/port');

export const ProxyKillRequest = z.object({
  enabled: z.boolean(),
});

export const ProxyProfile = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['socks5', 'http']),
  host: z.string(),
  port: z.number(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const ProxyStatusResponse = z.object({
  healthy: z.boolean(),
  killSwitchEnabled: z.boolean(),
  active: z.object({
    profileId: z.string().optional(),
    tabId: z.string().optional(),
  }).optional(),
});

// Profile schemas
export const ProfileCreateRequest = z.object({
  name: z.string().min(1).max(100),
  proxy: ProxyProfile.optional(),
});

export const Profile = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  proxy: ProxyProfile.optional(),
});

// Settings schemas
export const SettingsSchema = z.object({
  privacy: z.object({
    burnOnClose: z.boolean().default(false),
    telemetry: z.enum(['off', 'on']).default('off'),
    doNotTrack: z.boolean().default(true),
  }).default({}),
  network: z.object({
    doh: z.boolean().default(false),
    dohProvider: z.enum(['cloudflare', 'quad9']).default('cloudflare'),
    proxy: z.string().nullable().default(null),
    perTabProxy: z.boolean().default(false),
  }).default({}),
  downloads: z.object({
    requireConsent: z.boolean().default(true),
  }).default({}),
  performance: z.object({
    tabSleepMins: z.number().min(1).max(120).default(20),
    memoryCapMB: z.number().min(100).max(8192).default(2048),
  }).default({}),
  ai: z.object({
    provider: z.enum(['local', 'openai', 'anthropic']).default('local'),
    model: z.string().default('qwen2.5-coder'),
    maxTokens: z.number().default(8192),
  }).default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Plugin schemas (see plugin manifest schema separately)
export const PluginLoadRequest = z.object({
  manifestPath: z.string(),
});

export const PluginStatus = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  running: z.boolean(),
  permissions: z.array(z.string()),
});

// Threat analysis schemas
export const ThreatScanRequest = z.object({
  url: z.string().url().optional(),
  filePath: z.string().optional(),
});

export const ThreatScanResponse = z.object({
  url: z.string().optional(),
  filePath: z.string().optional(),
  dns: z.object({
    resolved: z.array(z.string()),
    cname: z.string().optional(),
  }).optional(),
  tls: z.object({
    grade: z.string(),
    valid: z.boolean(),
  }).optional(),
  trackers: z.array(z.string()),
  risks: z.array(z.string()),
  score: z.number().min(0).max(100),
});

// Research schemas
export const ResearchExportRequest = z.object({
  format: z.enum(['markdown', 'csv', 'json']),
  sources: z.array(z.string().url()),
  includeNotes: z.boolean().default(true),
});

// Download schemas
export const DownloadConsentRequest = z.object({
  url: z.string().url(),
  filename: z.string(),
  size: z.number().optional(),
});

export const DownloadRecord = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  checksum: z.string().optional(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
});

// Export types for use in handlers
export type TabCreateRequest = z.infer<typeof TabCreateRequest>;
export type TabCreateResponse = z.infer<typeof TabCreateResponse>;
export type TabCreateWithProfileRequest = z.infer<typeof TabCreateWithProfileRequest>;
export type TabCloseRequest = z.infer<typeof TabCloseRequest>;
export type TabActivateRequest = z.infer<typeof TabActivateRequest>;
export type TabNavigateRequest = z.infer<typeof TabNavigateRequest>;
export type TabListResponse = z.infer<typeof TabListResponse>;
export type TabInfo = z.infer<typeof TabInfo>;
export type ProxySetRequest = z.infer<typeof ProxySetRequest>;
export type ProxyKillRequest = z.infer<typeof ProxyKillRequest>;
export type ProxyProfile = z.infer<typeof ProxyProfile>;
export type ProxyStatusResponse = z.infer<typeof ProxyStatusResponse>;
export type ProfileCreateRequest = z.infer<typeof ProfileCreateRequest>;
export type Profile = z.infer<typeof Profile>;
export type ThreatScanRequest = z.infer<typeof ThreatScanRequest>;
export type ThreatScanResponse = z.infer<typeof ThreatScanResponse>;
export type ResearchExportRequest = z.infer<typeof ResearchExportRequest>;
export type DownloadConsentRequest = z.infer<typeof DownloadConsentRequest>;
export type DownloadRecord = z.infer<typeof DownloadRecord>;

// Storage/Settings schemas
export const GetSettingRequest = z.object({
  key: z.string(),
});

export const SetSettingRequest = z.object({
  key: z.string(),
  value: z.unknown(),
});

export const ListWorkspacesResponse = z.array(z.object({
  id: z.string(),
  name: z.string(),
  partition: z.string(),
  proxyProfileId: z.string().optional(),
}));

export const SaveWorkspaceRequest = z.object({
  id: z.string(),
  name: z.string(),
  partition: z.string(),
  proxyProfileId: z.string().optional(),
});

// Agent enhancements
export const AgentAskRequest = z.object({
  query: z.string().min(1),
  context: z.object({
    url: z.string().optional(),
    text: z.string().optional(),
  }).optional(),
});

export const AgentAskResponse = z.object({
  answer: z.string(),
  sources: z.array(z.string()).optional(),
});

export const DeepResearchRequest = z.object({
  query: z.string().min(1),
  maxSources: z.number().min(1).max(50).default(10),
  outputFormat: z.enum(['json', 'csv', 'markdown']).default('markdown'),
  includeCitations: z.boolean().default(true),
});

export const DeepResearchResponse = z.object({
  query: z.string(),
  sources: z.array(z.object({
    url: z.string(),
    title: z.string(),
    summary: z.string(),
    citations: z.array(z.object({
      claim: z.string(),
      citation: z.string().optional(),
    })),
  })),
  synthesized: z.string(),
  exported: z.string().optional(),
});

// Citation graph
export const CitationGraphExtractRequest = z.object({
  text: z.string(),
  url: z.string().optional(),
});

export const CitationGraphGetResponse = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['url', 'entity', 'claim']),
    label: z.string(),
    url: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.enum(['cites', 'mentions', 'relates_to']),
    weight: z.number().optional(),
  })),
});

export const CitationGraphExportRequest = z.object({
  format: z.enum(['json', 'graphml']).default('json'),
});

// Ollama
export const OllamaCheckRequest = z.object({});
export const OllamaCheckResponse = z.object({
  available: z.boolean(),
  models: z.array(z.string()).optional(),
});

export const OllamaListModelsRequest = z.object({});
export const OllamaListModelsResponse = z.object({
  models: z.array(z.string()),
});

// Knowledge clustering
export const ClusteringRequest = z.object({
  sources: z.array(z.object({
    url: z.string(),
    title: z.string(),
    text: z.string().optional(),
  })),
  threshold: z.number().min(0).max(1).default(0.7),
});

export const ClusteringResponse = z.object({
  clusters: z.array(z.object({
    id: z.string(),
    label: z.string(),
    topics: z.array(z.string()),
    sources: z.array(z.object({
      url: z.string(),
      title: z.string(),
      similarity: z.number(),
    })),
    createdAt: z.number(),
  })),
});

// PDF parsing
export const PDFParseRequest = z.object({
  filePath: z.string(),
});

export const PDFParseResponse = z.object({
  metadata: z.object({
    title: z.string().optional(),
    author: z.array(z.string()).optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    year: z.number().optional(),
    doi: z.string().optional(),
    url: z.string().optional(),
    abstract: z.string().optional(),
  }),
  text: z.string(),
  citations: z.array(z.object({
    text: z.string(),
    authors: z.array(z.string()).optional(),
    year: z.number().optional(),
    title: z.string().optional(),
    journal: z.string().optional(),
    url: z.string().optional(),
  })),
  bibtex: z.string().optional(),
});

// Cognitive learning
export const CognitiveRecordPatternRequest = z.object({
  url: z.string(),
  domain: z.string(),
  timeSpent: z.number(),
  actions: z.array(z.string()),
  topics: z.array(z.string()).optional(),
});

export const CognitiveGetSuggestionsRequest = z.object({
  currentUrl: z.string().optional(),
  recentActions: z.array(z.string()).optional(),
});

export const CognitiveGetSuggestionsResponse = z.array(z.object({
  type: z.enum(['action', 'topic', 'workflow']),
  message: z.string(),
  confidence: z.number(),
}));

export const CognitiveGetPersonaResponse = z.object({
  interests: z.array(z.string()),
  habits: z.array(z.string()),
  patterns: z.string(),
});

// Workspace v2
export const WorkspaceV2SaveRequest = z.object({
  id: z.string(),
  name: z.string(),
  tabs: z.array(z.object({
    id: z.string(),
    url: z.string(),
    title: z.string().optional(),
    position: z.number(),
  })),
  notes: z.record(z.string()).optional(),
  proxyProfileId: z.string().optional(),
  mode: z.string().optional(),
  layout: z.object({
    sidebarWidth: z.number().optional(),
    rightPanelWidth: z.number().optional(),
    splitPaneRatio: z.number().optional(),
  }).optional(),
});

export const WorkspaceV2LoadRequest = z.object({
  workspaceId: z.string(),
});

export const WorkspaceV2UpdateNotesRequest = z.object({
  workspaceId: z.string(),
  tabId: z.string(),
  note: z.string(),
});

// Session bundle
export const SessionBundleExportRequest = z.object({
  runId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const SessionBundleImportRequest = z.object({
  filePath: z.string(),
});

export const SessionBundleReplayRequest = z.object({
  bundleId: z.string(),
  restoreWorkspace: z.boolean().default(false),
  replayAgent: z.boolean().default(false),
});

// History graph
export const HistoryGraphRecordNavigationRequest = z.object({
  fromUrl: z.string().nullable(),
  toUrl: z.string(),
  title: z.string().optional(),
});

export const HistoryGraphGetRequest = z.object({
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

// OmniScript
export const OmniScriptParseRequest = z.object({
  command: z.string(),
});

export const OmniScriptExecuteRequest = z.object({
  commands: z.array(z.string()),
});

// OmniBrain
export const OmniBrainAddDocumentRequest = z.object({
  text: z.string(),
  url: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const OmniBrainSearchRequest = z.object({
  query: z.string(),
  limit: z.number().min(1).max(100).default(10),
});

export const OmniBrainSearchResponse = z.array(z.object({
  document: z.object({
    id: z.string(),
    text: z.string(),
    url: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.number(),
  }),
  similarity: z.number(),
}));

// Spiritual layer
export const SpiritualFocusModeEnableRequest = z.object({
  ambientSound: z.enum(['none', 'nature', 'rain', 'ocean', 'meditation']).optional(),
  breathingOverlay: z.boolean().optional(),
  timer: z.number().optional(),
  notifications: z.boolean().optional(),
});

// Plugin marketplace
export const PluginMarketplaceInstallRequest = z.object({
  pluginId: z.string(),
  verifySignature: z.boolean().default(true),
});

export const PluginMarketplaceUninstallRequest = z.object({
  pluginId: z.string(),
});

// Enhanced Threat Scanner
export const ThreatScanUrlEnhancedRequest = z.object({
  url: z.string().url(),
});

export const ThreatScanFileEnhancedRequest = z.object({
  filePath: z.string(),
});

export const ThreatAnalyzeFileRequest = z.object({
  filePath: z.string(),
});

export const ThreatDetectFingerprintRequest = z.object({
  html: z.string(),
  headers: z.record(z.string()),
});

// Performance
export const PerformanceSnapshotCreateRequest = z.object({
  windows: z.array(z.object({
    bounds: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
    tabs: z.array(z.object({
      id: z.string(),
      url: z.string(),
      title: z.string().optional(),
    })),
    activeTabId: z.string().optional(),
  })),
  workspace: z.string().optional(),
});

export const PerformanceSnapshotRestoreRequest = z.object({
  snapshotId: z.string(),
});

// Workers
export const WorkerScrapingRunRequest = z.object({
  id: z.string(),
  urls: z.array(z.string().url()),
  selectors: z.array(z.string()).optional(),
  pagination: z.object({
    maxPages: z.number(),
    nextSelector: z.string().optional(),
  }).optional(),
});

