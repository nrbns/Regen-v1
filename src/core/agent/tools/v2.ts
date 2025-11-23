/**
 * Tool Registry v2 - Tier 3 Pillar 1
 * Declarative tool definitions with schemas
 */

import { z } from 'zod';
import type { ToolContext } from '../graph';
import { toolRegistry as v1Registry } from '../../../agent/registry';
import { log } from '../../../utils/logger';
import { requireCapability } from '../../security/capabilities';

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  run: (input: unknown, ctx: ToolContext) => Promise<unknown>;
  category?: 'research' | 'trade' | 'docs' | 'threat' | 'general';
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
};

class ToolRegistryV2 {
  private tools: Map<string, ToolDef> = new Map();
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Register a tool
   */
  register(tool: ToolDef): void {
    this.tools.set(tool.name, tool);
    log.info(`[ToolRegistryV2] Registered tool: ${tool.name} (${tool.category || 'general'})`);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDef | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ToolDef[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolDef['category']): ToolDef[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Execute a tool with validation
   */
  async execute(name: string, input: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Check rate limit
    if (tool.rateLimit && !this.checkRateLimit(name, tool.rateLimit)) {
      throw new Error(`Rate limit exceeded for tool: ${name}`);
    }

    // Validate input
    try {
      const validatedInput = tool.inputSchema.parse(input);
      const output = await tool.run(validatedInput, ctx);
      const validatedOutput = tool.outputSchema.parse(output);
      return validatedOutput;
    } catch (error) {
      if (error instanceof z.ZodError) {
        log.error(`[ToolRegistryV2] Validation error for ${name}:`, error.errors);
        throw new Error(
          `Invalid input for tool ${name}: ${error.errors.map(e => e.message).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(name: string, limit: { requests: number; window: number }): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(name);

    if (!limiter || now > limiter.resetAt) {
      // Reset or initialize
      this.rateLimiters.set(name, {
        count: 1,
        resetAt: now + limit.window,
      });
      return true;
    }

    if (limiter.count >= limit.requests) {
      return false;
    }

    limiter.count++;
    return true;
  }
}

// Singleton instance
export const toolRegistryV2 = new ToolRegistryV2();

/**
 * Register built-in tools
 */

// Scrape page tool
toolRegistryV2.register({
  name: 'scrape_page',
  description: 'Scrape content from a URL',
  inputSchema: z.object({
    url: z.string().url(),
    extract: z.enum(['text', 'html', 'markdown']).optional().default('text'),
  }),
  outputSchema: z.object({
    url: z.string(),
    title: z.string(),
    content: z.string(),
    scrapedAt: z.number(),
  }),
  category: 'research',
  run: async (input, _ctx) => {
    const v1Tool = v1Registry.get('scrapePage');
    if (!v1Tool) throw new Error('scrapePage tool not found');
    return v1Tool.execute(input);
  },
});

// Summarize text tool
toolRegistryV2.register({
  name: 'summarize_text',
  description: 'Summarize text content',
  inputSchema: z.object({
    text: z.string(),
    maxLength: z.number().optional().default(200),
    format: z.enum(['bullet', 'paragraph', 'list']).optional().default('paragraph'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    originalLength: z.number(),
    summaryLength: z.number(),
  }),
  category: 'general',
  run: async (input, ctx) => {
    const v1Tool = v1Registry.get('summarizeText');
    if (!v1Tool) throw new Error('summarizeText tool not found');
    const result = await v1Tool.execute(input);
    // Remember format preference
    ctx.memory.remember('preference', 'summary_format', (input as any).format);
    return result;
  },
});

// Search web tool
toolRegistryV2.register({
  name: 'search_web',
  description: 'Search the web for information',
  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().optional().default(5),
    sources: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    query: z.string(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })
    ),
  }),
  category: 'research',
  rateLimit: {
    requests: 10,
    window: 60000, // 1 minute
  },
  run: async (input, _ctx) => {
    const v1Tool = v1Registry.get('searchWeb');
    if (!v1Tool) throw new Error('searchWeb tool not found');
    return v1Tool.execute(input);
  },
});

// Extract table tool
toolRegistryV2.register({
  name: 'extract_table',
  description: 'Extract tables from a page or document',
  inputSchema: z.object({
    url: z.string().url().optional(),
    html: z.string().optional(),
    tableIndex: z.number().optional().default(0),
  }),
  outputSchema: z.object({
    table: z.array(z.array(z.string())),
    headers: z.array(z.string()).optional(),
  }),
  category: 'docs',
  run: async (_input, _ctx) => {
    // TODO: Implement table extraction
    throw new Error('extract_table not yet implemented');
  },
});

// Manage tabs tool
toolRegistryV2.register({
  name: 'manage_tabs',
  description: 'Create, close, or switch tabs',
  inputSchema: z.object({
    action: z.enum(['create', 'close', 'switch', 'list']),
    url: z.string().url().optional(),
    tabId: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tabId: z.string().optional(),
    tabs: z.array(z.any()).optional(),
  }),
  category: 'general',
  run: async (input, _ctx) => {
    const { ipc } = await import('../../../lib/ipc-typed');
    const { useTabsStore } = await import('../../../state/tabsStore');
    const typedInput = input as {
      action: 'create' | 'close' | 'switch' | 'list';
      url?: string;
      tabId?: string;
    };

    switch (typedInput.action) {
      case 'create':
        requireCapability('open_tabs');
        if (!typedInput.url) throw new Error('URL required for create action');
        const newTab = await ipc.tabs.create(typedInput.url);
        let tabId: string | null = null;
        if (newTab) {
          if (typeof newTab === 'object' && 'id' in newTab && typeof newTab.id === 'string') {
            tabId = newTab.id;
          } else if (typeof newTab === 'string') {
            tabId = newTab;
          }
          if (tabId) {
            useTabsStore.getState().setActive(tabId);
          }
        }
        return { success: true, tabId: tabId || undefined };
      case 'close':
        requireCapability('close_tabs');
        if (!typedInput.tabId) throw new Error('tabId required for close action');
        await ipc.tabs.close({ id: typedInput.tabId });
        return { success: true };
      case 'switch':
        requireCapability('navigate_tabs');
        if (!typedInput.tabId) throw new Error('tabId required for switch action');
        useTabsStore.getState().setActive(typedInput.tabId);
        await ipc.tabs.activate({ id: typedInput.tabId });
        return { success: true, tabId: typedInput.tabId };
      case 'list':
        const tabs = useTabsStore.getState().tabs;
        return { success: true, tabs };
      default:
        throw new Error(`Unknown action: ${(input as any).action}`);
    }
  },
});

// Manage workspaces tool
toolRegistryV2.register({
  name: 'manage_workspaces',
  description: 'Create, restore, or list workspaces',
  inputSchema: z.object({
    action: z.enum(['create', 'restore', 'list']),
    name: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    workspaceId: z.string().optional(),
    workspaces: z.array(z.any()).optional(),
  }),
  category: 'general',
  run: async (input, _ctx) => {
    const { useWorkspacesStore } = await import('../../../state/workspacesStore');
    const { useTabsStore } = await import('../../../state/tabsStore');
    const { useAppStore } = await import('../../../state/appStore');
    const typedInput = input as {
      action: 'create' | 'restore' | 'list';
      name?: string;
      workspaceId?: string;
    };

    switch (typedInput.action) {
      case 'create':
        requireCapability('save_workspaces');
        if (!typedInput.name) throw new Error('name required for create action');
        const tabs = useTabsStore.getState().tabs;
        const mode = useAppStore.getState().mode;
        const workspaceId = useWorkspacesStore.getState().add({
          name: typedInput.name,
          tabs,
          mode,
        });
        return { success: true, workspaceId };
      case 'restore':
        if (!typedInput.workspaceId) throw new Error('workspaceId required for restore action');
        const workspace = useWorkspacesStore.getState().get(typedInput.workspaceId);
        if (!workspace) throw new Error('Workspace not found');
        // Restore logic would go here
        return { success: true, workspaceId: typedInput.workspaceId };
      case 'list':
        const workspaces = useWorkspacesStore.getState().workspaces;
        return { success: true, workspaces };
      default:
        throw new Error(`Unknown action: ${(input as any).action}`);
    }
  },
});
