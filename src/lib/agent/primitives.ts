/**
 * Agent Primitives Client
 * Type-safe client for agent primitives from renderer process
 */

import { ipc } from '../ipc-typed';

export interface ReadPageOptions {
  url: string;
  extractText?: boolean;
  extractHtml?: boolean;
}

export interface ClickOptions {
  url: string;
  selector?: string;
  text?: string;
  waitForNavigation?: boolean;
}

export interface FillInputOptions {
  url: string;
  selector: string;
  value: string;
  submit?: boolean;
}

export interface FillFormOptions {
  url: string;
  fields: Array<{ selector: string; value: string }>;
  submitSelector?: string;
}

export interface ScreenshotOptions {
  url: string;
  selector?: string;
  fullPage?: boolean;
  format?: 'png' | 'jpeg';
}

export interface SaveToMemoryOptions {
  content: string;
  title?: string;
  url?: string;
  tags?: string[];
}

/**
 * Agent Primitives API
 * Type-safe client for agent primitives
 */
export const agentPrimitives = {
  /**
   * Read page content
   */
  async readPage(options: ReadPageOptions) {
    const result = await (window.agent as any)?.executeSkill?.('read_page', options);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to read page');
    }
    return result.result;
  },

  /**
   * Extract tables from page
   */
  async extractTables(url: string, all: boolean = false) {
    const skill = all ? 'extract_all_tables' : 'extract_table';
    const result = await (window.agent as any)?.executeSkill?.(skill, { url });
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to extract tables');
    }
    return result.result;
  },

  /**
   * Click an element
   */
  async click(options: ClickOptions) {
    const result = await (window.agent as any)?.executeSkill?.('click', options);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to click element');
    }
    return result.result;
  },

  /**
   * Fill a single input
   */
  async fillInput(options: FillInputOptions) {
    const result = await (window.agent as any)?.executeSkill?.('fill_input', options);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to fill input');
    }
    return result.result;
  },

  /**
   * Fill a form with multiple fields
   */
  async fillForm(options: FillFormOptions) {
    const result = await (window.agent as any)?.executeSkill?.('fill_form', options);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to fill form');
    }
    return result.result;
  },

  /**
   * Take a screenshot
   */
  async screenshot(options: ScreenshotOptions) {
    const result = await (window.agent as any)?.executeSkill?.('screenshot', options);
    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to take screenshot');
    }
    return result.result;
  },

  /**
   * Save content to SuperMemory
   */
  async saveToMemory(options: SaveToMemoryOptions) {
    // This integrates with SuperMemory tracker
    const { trackNote } = await import('../../core/supermemory/tracker');
    await trackNote(options.url || '', {
      title: options.title || options.content.substring(0, 100),
      noteLength: options.content.length,
    });
    return { success: true };
  },
};

