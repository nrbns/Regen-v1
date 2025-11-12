import { ipcMain, BrowserWindow, app } from 'electron';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { stealthFetchPage } from './stealth-fetch';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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
  } catch (error) {
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
      return { content: '', title: '', html: '' };
    }

    // Get active BrowserView from window (most recently added is typically active)
    const views = win.getBrowserViews();
    const view = views.length > 0 ? views[views.length - 1] : null;
    
    if (!view) {
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
        `, true).catch(() => ''),
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

  // registerResearchPipelineIpc(); // Temporarily disabled
}
