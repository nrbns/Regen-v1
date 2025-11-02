import { ipcMain, BrowserWindow } from 'electron';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { fetch } from 'undici';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';

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
}
