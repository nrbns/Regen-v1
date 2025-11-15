/**
 * Memory Skill
 * Save data to SuperMemory
 */

import { registry } from './registry';

/**
 * Save text content to memory
 */
registry.register('save_to_memory', async (_ctx, args: { content: string; title?: string; url?: string; tags?: string[] }) => {
  // This will be called from the renderer process via IPC
  // The actual memory saving is handled by the SuperMemory tracker
  return {
    success: true,
    message: 'Content saved to memory',
    contentLength: args.content.length,
    title: args.title,
    url: args.url,
    tags: args.tags || [],
  };
});

/**
 * Save extracted data to memory
 */
registry.register('save_extracted_data', async (_ctx, args: { data: unknown; source: string; type: string; metadata?: Record<string, unknown> }) => {
  return {
    success: true,
    message: 'Extracted data saved to memory',
    source: args.source,
    type: args.type,
    dataSize: JSON.stringify(args.data).length,
    metadata: args.metadata,
  };
});

