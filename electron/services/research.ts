import { ipcMain, BrowserWindow, app } from 'electron';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { stealthFetchPage } from './stealth-fetch';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ingestDocument,
  ingestSnapshot,
  saveChunks,
  saveDocumentMetadata,
  // getDocumentMetadata,
  getDocumentChunks,
  listDocuments,
} from './research/ingestion';
import { registerClipperIpc } from './research/clipper';

type SearchDoc = { url: string; title: string; snippet: string };
type Answer = { answer: string; citations: SearchDoc[] };

// In-memory storage for notes (could be moved to persistent storage)
const notesStore = new Map<string, { notes: string; highlights: any[] }>();

async function getLinksFromDuckDuckGo(q: string): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'OmniBrowserBot/1.0' } });
  const html = await res.text();
  const links = Array.from(html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/g)).map(m => m[1]);
  // Fallback generic anchors
  return links.slice(0, 10);
}

async function fetchReadable(target: string) {
  const stealthResult = await stealthFetchPage(target, { timeout: 12000 }).catch(() => null);
  try {
    if (!stealthResult) {
      throw new Error('Stealth fetch failed');
    }
    const finalUrl = stealthResult.finalUrl || target;
    const dom = new JSDOM(stealthResult.html, { url: finalUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;
    const text = (article.textContent || '').replace(/[\t\r]+/g,' ').trim();
    const title = article.title || stealthResult.title || dom.window.document.title || finalUrl;
    return { url: finalUrl, title, text };
  } catch {
    const res = await fetch(target, { headers: { 'User-Agent': 'OmniBrowserBot/1.0' } }).catch(()=> null as any);
    if (!res || !res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html, { url: target });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;
    const text = (article.textContent || '').replace(/[\t\r]+/g,' ').trim();
    const title = article.title || dom.window.document.title || target;
    return { url: target, title, text };
  }
}

function pickSnippets(text: string, query: string, max = 3): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sents = text.split(/(?<=[.!?])\s+/);
  const scored = sents.map(s => ({ s, score: terms.reduce((acc,t)=> acc + (s.toLowerCase().includes(t) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a,b)=> b.score - a.score)
    .slice(0, max)
    .map(x => x.s);
  return scored;
}

function tinySummarize(snips: string[], query: string): string {
  if (!snips.length) return `No direct matches found. Try refining: ${query}`;
  const joined = snips.join(' ');
  const maxLen = 600;
  return (joined.length > maxLen ? joined.slice(0, maxLen) + '…' : joined);
}

type StoredNotesEntry = { notes: string; highlights: Array<Record<string, unknown>> };

interface StructuredHighlight {
  text: string;
  note?: string;
  color?: string;
  createdAt?: number;
}

interface StructuredEntry {
  url: string;
  title: string;
  notes: string;
  highlights: StructuredHighlight[];
}

function getStoredEntry(url: string): StoredNotesEntry {
  const stored = notesStore.get(url);
  if (!stored) {
    return { notes: '', highlights: [] };
  }
  return {
    notes: typeof stored.notes === 'string' ? stored.notes : '',
    highlights: Array.isArray(stored.highlights) ? stored.highlights : [],
  };
}

function deriveTitle(url: string, notes: string): string {
  const trimmedNotes = notes.trim();
  if (trimmedNotes.startsWith('#')) {
    const firstLine = trimmedNotes.split('\n')[0]?.replace(/^#+\s*/, '').trim();
    if (firstLine) return firstLine.slice(0, 120);
  }

  if (trimmedNotes) {
    const firstLine = trimmedNotes.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length <= 80) {
      return firstLine;
    }
  }

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname && urlObj.pathname !== '/' ? urlObj.pathname.replace(/\/+/g, ' ').trim() : '';
    return (path ? `${urlObj.hostname} ${path}` : urlObj.hostname).slice(0, 120) || url;
  } catch {
    return url;
  }
}

function normalizeHighlight(raw: Record<string, unknown>): StructuredHighlight {
  const text = typeof raw?.text === 'string' ? raw.text : '';
  const note = typeof raw?.note === 'string' ? raw.note : undefined;
  const color = typeof raw?.color === 'string' ? raw.color : undefined;
  const createdAt = typeof raw?.createdAt === 'number' ? raw.createdAt : undefined;
  return { text, note, color, createdAt };
}

function collectStructuredEntries(urls: string[]): StructuredEntry[] {
  return urls.map((url) => {
    const stored = getStoredEntry(url);
    return {
      url,
      title: deriveTitle(url, stored.notes),
      notes: stored.notes ?? '',
      highlights: stored.highlights
        .map((raw) => normalizeHighlight(raw))
        .filter((h) => h.text && h.text.trim().length > 0),
    };
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'note';
}

function formatMarkdownSection(entry: StructuredEntry, includeNotes: boolean, headingLevel = 2): string {
  const heading = '#'.repeat(Math.min(Math.max(headingLevel, 1), 6));
  const lines: string[] = [];
  lines.push(`${heading} ${entry.title}`);
  lines.push(`_Source: ${entry.url}_`);
  lines.push('');
  lines.push('### Highlights');

  if (entry.highlights.length === 0) {
    lines.push('- None captured');
  } else {
    for (const highlight of entry.highlights) {
      const details = [];
      if (highlight.text) {
        details.push(highlight.text);
      }
      if (highlight.note) {
        details.push(`Note: ${highlight.note}`);
      }
      lines.push(`- ${details.join(' — ')}`);
    }
  }

  if (includeNotes) {
    lines.push('');
    lines.push('### Notes');
    lines.push(entry.notes.trim() ? entry.notes.trim() : '_No notes saved_');
  }

  return lines.join('\n');
}

function truncateForNotion(text: string, max = 1900): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function toRichText(text: string) {
  return [
    {
      type: 'text',
      text: {
        content: truncateForNotion(text),
      },
    },
  ];
}

function paragraphBlock(text: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: toRichText(text),
    },
  };
}

function headingBlock(level: 1 | 2 | 3, text: string) {
  const type = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3';
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: toRichText(text),
    },
  };
}

function buildNotionBlocks(entry: StructuredEntry, includeNotes: boolean) {
  const blocks: any[] = [];
  blocks.push(paragraphBlock(`Source: ${entry.url}`));

  blocks.push(headingBlock(2, 'Highlights'));
  if (entry.highlights.length === 0) {
    blocks.push(paragraphBlock('No highlights captured.'));
  } else {
    for (const highlight of entry.highlights) {
      const parts = [highlight.text];
      if (highlight.note) {
        parts.push(`Note: ${highlight.note}`);
      }
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: toRichText(parts.filter(Boolean).join(' — ')),
        },
      });
    }
  }

  if (includeNotes) {
    blocks.push(headingBlock(2, 'Notes'));
    if (entry.notes.trim()) {
      entry.notes
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .forEach((paragraph) => {
          blocks.push(paragraphBlock(paragraph));
        });
    } else {
      blocks.push(paragraphBlock('No notes saved.'));
    }
  }

  return blocks.slice(0, 100);
}

export function registerResearchIpc() {
  // Legacy handler
  ipcMain.handle('research:query', async (_e, q: string) => {
    const links = await getLinksFromDuckDuckGo(q).catch(()=> [] as string[]);
    const docs: { url: string; title: string; text: string }[] = [];
    for (const link of links.slice(0, 5)) {
      const doc = await fetchReadable(link);
      if (doc && doc.text) docs.push(doc);
    }
    const allSnips: SearchDoc[] = [];
    for (const d of docs) {
      const snips = pickSnippets(d.text, q, 2);
      if (snips.length) allSnips.push({ url: d.url, title: d.title, snippet: snips.join(' ') });
    }
    const answer: Answer = { answer: tinySummarize(allSnips.map(s => s.snippet), q), citations: allSnips.slice(0, 5) };
    return answer;
  });

  // Extract readable content from active tab
  registerHandler('research:extractContent', z.object({
    tabId: z.string().optional(),
  }), async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (!win) {
      console.warn('[Research] No window found for content extraction');
      return { content: '', title: '', html: '' };
    }

    // Try to find the specific tab's BrowserView if tabId is provided
    let view = null;
    if (request.tabId) {
      // Import tabs service to find the view by tabId
      try {
        const tabsModule = await import('./tabs');
        const findTabById = (tabsModule as any).findTabById;
        if (typeof findTabById === 'function') {
          const tabRecord = findTabById(request.tabId);
          if (tabRecord?.view) {
            view = tabRecord.view;
            console.log('[Research] Found tab by ID:', request.tabId);
          }
        }
      } catch (err) {
        console.warn('[Research] Could not find tab by ID, using active view:', err);
      }
    }
    
    // Fallback: Get active BrowserView from window (most recently added is typically active)
    if (!view) {
      const views = win.getBrowserViews();
      view = views.length > 0 ? views[views.length - 1] : null;
    }
    
    if (!view) {
      console.warn('[Research] No BrowserView found for content extraction');
      return { content: '', title: '', html: '' };
    }

    try {
      const webContents = view.webContents;
      const url = webContents.getURL();
      
      // Skip special pages
      if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
        return { content: '', title: '', html: '' };
      }

      // Wait for page to be ready
      if (webContents.isLoading()) {
        await new Promise<void>((resolve) => {
          const onFinish = () => {
            webContents.off('did-finish-load', onFinish);
            webContents.off('did-fail-load', onFinish);
            resolve();
          };
          webContents.once('did-finish-load', onFinish);
          webContents.once('did-fail-load', onFinish);
          // Timeout after 5 seconds
          setTimeout(() => {
            onFinish();
          }, 5000);
        });
      }

      // Additional wait for DOM to be ready (some pages load content dynamically)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get HTML and title
      const [html, title] = await Promise.all([
        webContents.executeJavaScript(`
          (() => {
            try {
              const doc = document.cloneNode(true);
              // Remove scripts, styles, etc.
              Array.from(doc.querySelectorAll('script, style, noscript, iframe, embed, object, svg')).forEach(el => el.remove());
              return doc.documentElement.outerHTML;
            } catch(e) {
              return document.documentElement.outerHTML;
            }
          })()
        `, true).catch((err: unknown) => {
          console.warn('[Research] Failed to extract HTML:', err);
          return '';
        }),
        webContents.executeJavaScript('document.title || document.querySelector("title")?.textContent || ""', true).catch(() => ''),
      ]);

      if (!html) {
        return { content: '', title: title || url, html: '' };
      }

      // Use Readability to extract clean content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (!article) {
        // Fallback: just return body text
        const bodyText = dom.window.document.body?.textContent || '';
        return { content: bodyText, title: title || url, html: '' };
      }

      return {
        content: article.textContent || '',
        title: article.title || title || url,
        html: article.content || html,
      };
    } catch (error) {
      console.error('Failed to extract content:', error);
      return { content: '', title: '', html: '' };
    }
  });

  // Save notes for a URL
  registerHandler('research:saveNotes', z.object({
    url: z.string(),
    notes: z.string(),
    highlights: z.array(z.any()).optional(),
  }), async (_event, request) => {
    notesStore.set(request.url, {
      notes: request.notes,
      highlights: request.highlights || [],
    });
    return { success: true };
  });

  // Get notes for a URL
  registerHandler('research:getNotes', z.object({
    url: z.string(),
  }), async (_event, request) => {
    const saved = notesStore.get(request.url);
    return saved || { notes: '', highlights: [] };
  });

  registerHandler('research:export', z.object({
    format: z.enum(['markdown', 'obsidian', 'notion']),
    sources: z.array(z.string().min(1)).nonempty(),
    includeNotes: z.boolean().optional(),
  }), async (_event, request) => {
    const includeNotes = request.includeNotes !== false;
    const entries = collectStructuredEntries(request.sources);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (request.format === 'markdown') {
      const exportDir = path.join(app.getPath('downloads'), 'OmniBrowser', 'Exports');
      await fs.mkdir(exportDir, { recursive: true }).catch(() => {});
      const filePath = path.join(exportDir, `research-export-${timestamp}.md`);

      const sections: string[] = [];
      sections.push(`# OmniBrowser Research Export`);
      sections.push(`_Generated ${new Date().toLocaleString()}_`);
      sections.push('');

      entries.forEach((entry) => {
        sections.push(formatMarkdownSection(entry, includeNotes, 2));
        sections.push('');
      });

      const content = `${sections.join('\n')}`.trimEnd() + '\n';
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true, path: filePath, format: 'markdown' as const };
    }

    if (request.format === 'obsidian') {
      const baseDir = path.join(app.getPath('documents'), 'OmniBrowser', 'ObsidianExports');
      const exportDir = path.join(baseDir, `research-${timestamp}`);
      await fs.mkdir(exportDir, { recursive: true }).catch(() => {});

      const writtenPaths: string[] = [];
      for (const entry of entries) {
        const filename = `${slugify(entry.title)}.md`;
        const filePath = path.join(exportDir, filename);
        const frontmatter = [
          '---',
          `title: "${entry.title.replace(/"/g, '\\"')}"`,
          `source: "${entry.url.replace(/"/g, '\\"')}"`,
          `exported: "${new Date().toISOString()}"`,
          '---',
          '',
        ].join('\n');
        const body = formatMarkdownSection(entry, includeNotes, 1);
        await fs.writeFile(filePath, `${frontmatter}${body.trim()}\n`, 'utf-8');
        writtenPaths.push(filePath);
      }

      return { success: true, format: 'obsidian' as const, folder: exportDir, paths: writtenPaths };
    }

    // Notion export
    const notionKey = process.env.NOTION_API_KEY ?? process.env.OMNIBROWSER_NOTION_KEY;
    if (!notionKey) {
      throw new Error('Notion export requires NOTION_API_KEY or OMNIBROWSER_NOTION_KEY environment variable.');
    }

    const notionDatabaseId = process.env.NOTION_DATABASE_ID ?? process.env.OMNIBROWSER_NOTION_DATABASE_ID;
    const notionParentPageId = process.env.NOTION_PARENT_PAGE_ID ?? process.env.OMNIBROWSER_NOTION_PARENT_ID;
    const titleProp = process.env.NOTION_TITLE_PROPERTY ?? (notionDatabaseId ? 'Name' : 'title');

    const parent = notionDatabaseId
      ? { database_id: notionDatabaseId }
      : notionParentPageId
        ? { page_id: notionParentPageId }
        : { workspace: true };

    const notionPages: Array<{ id: string; url: string; title: string }> = [];

    for (const entry of entries) {
      const body: any = {
        parent,
        properties: notionDatabaseId
          ? {
              [titleProp]: {
                title: toRichText(entry.title),
              },
            }
          : {
              title: {
                title: toRichText(entry.title),
              },
            },
        children: buildNotionBlocks(entry, includeNotes),
      };

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${notionKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Notion export failed: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
      notionPages.push({
        id: data.id,
        url: data.url,
        title: entry.title,
      });
    }

    return { success: true, format: 'notion' as const, notionPages };
  });

  // Save tab snapshot
  registerHandler('research:saveSnapshot', z.object({
    tabId: z.string(),
  }), async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('No window found');
    }

    // Find the tab's BrowserView
    const views = win.getBrowserViews();
    // For now, we'll use the active view - in a full implementation, we'd track tabId to view mapping
    const view = views.length > 0 ? views[views.length - 1] : null;
    
    if (!view) {
      throw new Error('No active tab found');
    }

    try {
      const webContents = view.webContents;
      const url = webContents.getURL();
      const title = webContents.getTitle() || url;

      // Skip special pages
      if (url.startsWith('about:') || url.startsWith('chrome:') || !url || url === 'about:blank') {
        throw new Error('Cannot snapshot special pages');
      }

      // Wait for page to be ready
      if (webContents.isLoading()) {
        await new Promise<void>((resolve) => {
          const onFinish = () => {
            webContents.off('did-finish-load', onFinish);
            webContents.off('did-fail-load', onFinish);
            resolve();
          };
          webContents.once('did-finish-load', onFinish);
          webContents.once('did-fail-load', onFinish);
          setTimeout(() => onFinish(), 5000);
        });
      }

      // Get full page HTML
      const html = await webContents.executeJavaScript(`
        (() => {
          try {
            const doc = document.cloneNode(true);
            // Remove scripts but keep structure
            Array.from(doc.querySelectorAll('script')).forEach(el => el.remove());
            return doc.documentElement.outerHTML;
          } catch(e) {
            return document.documentElement.outerHTML;
          }
        })()
      `, true).catch(() => '');

      if (!html) {
        throw new Error('Failed to capture page HTML');
      }

      // Save snapshot to file
      const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const snapshotsDir = path.join(app.getPath('userData'), 'research', 'snapshots');
      await fs.mkdir(snapshotsDir, { recursive: true });
      const snapshotPath = path.join(snapshotsDir, `${snapshotId}.html`);

      // Save HTML with metadata
      const snapshotData = {
        id: snapshotId,
        url,
        title,
        html,
        capturedAt: Date.now(),
        tabId: request.tabId,
      };

      await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

      // Process snapshot through ingestion pipeline
      try {
        const { metadata, chunks } = await ingestSnapshot(snapshotPath, snapshotId, {
          url,
          title,
          tabId: request.tabId,
        });

        // Save metadata and chunks
        await saveDocumentMetadata(metadata);
        await saveChunks(chunks);

        console.log(`[Research] Ingested snapshot: ${snapshotId} (${chunks.length} chunks)`);
      } catch (ingestionError) {
        console.error('[Research] Failed to ingest snapshot:', ingestionError);
        // Don't fail the snapshot save if ingestion fails
      }

      return { snapshotId, url };
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      throw error;
    }
  });

  // Upload file for research
  registerHandler('research:uploadFile', z.object({
    filename: z.string(),
    content: z.string(), // base64 encoded
    mimeType: z.string(),
    size: z.number(),
  }), async (_event, request) => {
    try {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const uploadsDir = path.join(app.getPath('userData'), 'research', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Decode base64 content
      const buffer = Buffer.from(request.content, 'base64');
      const filePath = path.join(uploadsDir, `${fileId}-${request.filename}`);

      await fs.writeFile(filePath, buffer);

      // Store metadata
      const metadataPath = path.join(uploadsDir, `${fileId}.meta.json`);
      const metadata = {
        fileId,
        filename: request.filename,
        mimeType: request.mimeType,
        size: request.size,
        uploadedAt: Date.now(),
        path: filePath,
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

      // Determine file type from extension
      const ext = path.extname(request.filename).toLowerCase().slice(1);
      let sourceType: 'pdf' | 'docx' | 'txt' | 'md' | 'html' = 'txt';
      
      if (ext === 'pdf') sourceType = 'pdf';
      else if (ext === 'docx' || ext === 'doc') sourceType = 'docx';
      else if (ext === 'md' || ext === 'markdown') sourceType = 'md';
      else if (ext === 'html' || ext === 'htm') sourceType = 'html';
      else sourceType = 'txt';

      // Process file through ingestion pipeline
      try {
        const { metadata: docMetadata, chunks } = await ingestDocument(
          filePath,
          fileId,
          sourceType,
          { title: request.filename }
        );

        // Save metadata and chunks
        await saveDocumentMetadata(docMetadata);
        await saveChunks(chunks);

        console.log(`[Research] Ingested file: ${fileId} (${chunks.length} chunks)`);
      } catch (ingestionError) {
        console.error('[Research] Failed to ingest file:', ingestionError);
        // Don't fail the upload if ingestion fails
      }

      return { fileId };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  });

  // List all ingested documents
  registerHandler('research:listDocuments', z.object({}), async () => {
    try {
      const documents = await listDocuments();
      return { documents };
    } catch (error) {
      console.error('Failed to list documents:', error);
      return { documents: [] };
    }
  });

  // Get document chunks for search
  registerHandler('research:getDocumentChunks', z.object({
    documentId: z.string(),
  }), async (_event, request) => {
    try {
      const chunks = await getDocumentChunks(request.documentId);
      return { chunks };
    } catch (error) {
      console.error('Failed to get document chunks:', error);
      return { chunks: [] };
    }
  });

  // Register clipper IPC handlers
  registerClipperIpc();

  // registerResearchPipelineIpc(); // Temporarily disabled
}
