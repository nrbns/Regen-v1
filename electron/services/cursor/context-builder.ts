/**
 * Context Builder for Cursor
 * Builds structured context from page content, editor state, and conversation history
 */

import type { CursorContext } from './cursor-adapter';

export interface PageSnapshot {
  url: string;
  title: string;
  html?: string;
  text?: string;
  images?: Array<{ src: string; alt?: string }>;
}

export interface EditorState {
  filePath: string;
  content: string;
  language?: string;
  cursorLine?: number;
  cursorCol?: number;
  selection?: { start: number; end: number };
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Extract main text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags but preserve structure
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract images from HTML
 * @internal - Currently unused but kept for future image extraction features
 */
function _extractImages(html: string): Array<{ src: string; alt?: string }> {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  const images: Array<{ src: string; alt?: string }> = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    images.push({
      src: match[1],
      alt: match[2],
    });
  }

  return images.slice(0, 10); // Limit to 10 images
}

/**
 * Truncate text to approximate token count (rough estimate: 1 token ≈ 4 chars)
 */
function truncateByTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

/**
 * Build Cursor context from various sources
 */
export class ContextBuilder {
  private maxContextTokens = 8000; // Default max tokens for context
  private conversationHistory: ConversationMessage[] = [];

  /**
   * Set max context tokens
   */
  setMaxTokens(tokens: number): void {
    this.maxContextTokens = tokens;
  }

  /**
   * Add conversation message
   */
  addMessage(message: ConversationMessage): void {
    this.conversationHistory.push(message);
    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Build context from page snapshot
   */
  async buildFromPage(
    snapshot: PageSnapshot,
    options: {
      includeHTML?: boolean;
      maxTextLength?: number;
    } = {}
  ): Promise<CursorContext> {
    const text = snapshot.text || (snapshot.html ? extractTextFromHTML(snapshot.html) : '');
    const textSnippet = options.maxTextLength
      ? truncateByTokens(text, options.maxTextLength)
      : truncateByTokens(text, 2000);

    return {
      page: {
        url: snapshot.url,
        title: snapshot.title,
        textSnippet,
        html: options.includeHTML ? snapshot.html : undefined,
      },
      conversation: this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };
  }

  /**
   * Build context from editor state
   */
  async buildFromEditor(
    editor: EditorState,
    options: {
      includeFullContent?: boolean;
    } = {}
  ): Promise<CursorContext> {
    const fileText = options.includeFullContent
      ? editor.content
      : truncateByTokens(editor.content, 4000);

    return {
      cursor:
        editor.cursorLine !== undefined && editor.cursorCol !== undefined
          ? { line: editor.cursorLine, col: editor.cursorCol }
          : undefined,
      files: [
        {
          path: editor.filePath,
          text: fileText,
          language: editor.language,
        },
      ],
      conversation: this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };
  }

  /**
   * Build combined context from page + editor
   */
  async buildCombined(
    page?: PageSnapshot,
    editor?: EditorState,
    options: {
      systemInstructions?: string;
      maxTokens?: number;
    } = {}
  ): Promise<CursorContext> {
    const maxTokens = options.maxTokens || this.maxContextTokens;
    const contexts: CursorContext[] = [];

    if (page) {
      const pageContext = await this.buildFromPage(page, {
        maxTextLength: Math.floor(maxTokens * 0.3), // 30% for page
      });
      contexts.push(pageContext);
    }

    if (editor) {
      const editorContext = await this.buildFromEditor(editor, {
        includeFullContent: false,
      });
      contexts.push(editorContext);
    }

    // Merge contexts
    const merged: CursorContext = {
      cursor:
        editor?.cursorLine !== undefined
          ? { line: editor.cursorLine, col: editor.cursorCol || 0 }
          : undefined,
      files: contexts.flatMap(c => c.files || []),
      page: contexts.find(c => c.page)?.page,
      conversation: this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      systemInstructions: options.systemInstructions,
    };

    return merged;
  }

  /**
   * Get current conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }
}

export const contextBuilder = new ContextBuilder();
