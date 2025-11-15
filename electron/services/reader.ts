import { BrowserWindow, app, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import {
  ReaderSummarizeRequest,
  ReaderSummarizeResponse,
  ReaderExportRequest,
} from '../shared/ipc/schema';
import { getOllamaAdapter } from './agent/ollama-adapter';
import { ensureConsent } from './consent-utils';
import { getCurrentSettings } from './storage';
import { getMainWindow } from './windows';

type SummaryBullet = z.infer<typeof ReaderSummarizeResponse>['bullets'][number];

export function registerReaderIpc(): void {
  registerHandler('reader:summarize', ReaderSummarizeRequest, async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    return summarizeArticle(request, win);
  });

  registerHandler('reader:export', ReaderExportRequest, async (_event, request) => {
    return exportArticle(request);
  });
}

async function summarizeArticle(
  request: z.infer<typeof ReaderSummarizeRequest>,
  win: BrowserWindow | null,
) {
  const text = (request.content || '').trim();
  if (!text) {
    return {
      mode: 'extractive' as const,
      bullets: [],
    };
  }

  const settings = getCurrentSettings();
  const adapter = getOllamaAdapter();
  const truncated = truncateText(text, 8000);
  const title = request.title?.trim() || '';
  const url = request.url;

  // Try local summarization first
  try {
    if (await adapter.checkAvailable()) {
      const bullets = await summarizeWithOllama(adapter, { title, text: truncated, url });
      return {
        mode: 'local' as const,
        bullets,
      };
    }
  } catch (error) {
    console.warn('[Reader] Local summarization failed, attempting fallback:', error);
  }

  // Cloud fallback with consent
  const provider = settings.ai?.provider ?? 'local';
  if (provider !== 'local') {
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.OMNIBROWSER_OPENAI_KEY;
    if (provider === 'openai' && apiKey) {
      const approved = await ensureConsent(win, {
        type: 'ai_cloud',
        description: `Send article content${url ? ` from ${new URL(url).hostname}` : ''} to OpenAI (${settings.ai.openaiModel}) for summarization`,
        target: url,
        metadata: { provider: 'openai', model: settings.ai.openaiModel },
        risk: 'high',
      });
      if (approved) {
        try {
          const bullets = await summarizeWithOpenAI(apiKey, settings.ai.openaiModel, {
            title,
            text: truncated,
            url,
          });
          return {
            mode: 'cloud' as const,
            bullets,
          };
        } catch (error) {
          console.warn('[Reader] Cloud summarization failed, falling back to extractive:', error);
        }
      }
    }
  }

  // Extractive fallback
  return {
    mode: 'extractive' as const,
    bullets: summarizeExtractively(text, url),
  };
}

async function exportArticle(request: z.infer<typeof ReaderExportRequest>) {
  const exportsDir = path.join(app.getPath('downloads'), 'OmniBrowser', 'ReaderExports');
  await fs.mkdir(exportsDir, { recursive: true });

  const safeTitle = slugify(request.title || 'article');
  const filename = `${safeTitle}.html`;
  const filePath = path.join(exportsDir, filename);

  const html = buildExportHtml({
    title: request.title || 'Article',
    url: request.url,
    html: request.html,
  });

  await fs.writeFile(filePath, html, 'utf-8');
  try {
    shell.showItemInFolder(filePath);
  } catch {
    // Ignore failures to open folder
  }

  return { success: true, path: filePath };
}

async function summarizeWithOllama(
  adapter: ReturnType<typeof getOllamaAdapter>,
  context: { title?: string; text: string; url?: string },
): Promise<SummaryBullet[]> {
  const systemPrompt =
    'You generate concise bullet-point summaries. Respond ONLY with JSON array. Each item must be {"summary": "...", "quote": "..."} where quote is an exact excerpt from the article supporting the summary. Keep summary under 40 words.';
  const userPrompt = [
    context.title ? `Title: ${context.title}` : '',
    context.url ? `URL: ${context.url}` : '',
    'Article:',
    context.text,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await adapter.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const items = parseSummaryJson(response);
  const bullets = items.length > 0 ? items : buildFallbackFromText(context.text);
  return bullets.map((item) => decorateBullet(item, context.url));
}

async function summarizeWithOpenAI(
  apiKey: string,
  model: string,
  context: { title?: string; text: string; url?: string },
): Promise<SummaryBullet[]> {
  const payload = {
    model: model || 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You generate concise bullet-point summaries. Respond ONLY with JSON array. Each item must be {"summary": "...", "quote": "..."} where quote is an exact excerpt from the article supporting the summary. Keep summary under 40 words.',
      },
      {
        role: 'user',
        content: [
          context.title ? `Title: ${context.title}` : '',
          context.url ? `URL: ${context.url}` : '',
          'Article:',
          context.text,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }
  const items = parseSummaryJson(content);
  const bullets = items.length > 0 ? items : buildFallbackFromText(context.text);
  return bullets.map((item) => decorateBullet(item, context.url));
}

function summarizeExtractively(text: string, url?: string): SummaryBullet[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter((p) => p.length > 40);

  const topParagraphs = paragraphs.slice(0, 4);

  return topParagraphs.map((para) =>
    decorateBullet(
      {
        summary: shortenSentence(para, 38),
        quote: para,
      },
      url,
    ),
  );
}

function parseSummaryJson(raw: string): Array<{ summary: string; quote?: string }> {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') {
            return { summary: item };
          }
          if (item && typeof item === 'object' && typeof item.summary === 'string') {
            return {
              summary: item.summary,
              quote: typeof item.quote === 'string' ? item.quote : undefined,
            };
          }
          return null;
        })
        .filter((entry): entry is { summary: string; quote?: string } => !!entry);
    }
  } catch (error) {
    console.warn('[Reader] Failed to parse summary JSON', error);
  }
  return [];
}

function decorateBullet(
  entry: { summary: string; quote?: string },
  url?: string,
): SummaryBullet {
  const summary = entry.summary.trim();
  const quote = entry.quote?.trim();
  return {
    summary,
    citation: quote
      ? {
          text: quote,
          url: url ? `${url}#:~:text=${encodeURIComponent(sanitizeFragment(quote))}` : url,
        }
      : url
      ? { text: summary, url }
      : undefined,
  };
}

function buildFallbackFromText(text: string): Array<{ summary: string; quote?: string }> {
  const sentences = text
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.slice(0, 4).map((sentence) => ({
    summary: shortenSentence(sentence, 38),
    quote: sentence,
  }));
}

function sanitizeFragment(snippet: string): string {
  return snippet.replace(/\s+/g, ' ').slice(0, 120);
}

function shortenSentence(sentence: string, maxWords: number): string {
  const words = sentence.split(/\s+/);
  if (words.length <= maxWords) return sentence;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'article';
}

function buildExportHtml(params: { title: string; url?: string; html: string }): string {
  const { title, url, html } = params;
  const timestamp = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 40px 20px;
    }
    main {
      max-width: 740px;
      margin: 0 auto;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(24px);
    }
    header {
      margin-bottom: 32px;
    }
    header h1 {
      font-size: 2.25rem;
      line-height: 1.2;
      margin: 0 0 12px 0;
    }
    header .meta {
      font-size: 0.9rem;
      color: #94a3b8;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    article {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #e2e8f0;
    }
    article h2, article h3, article h4 {
      color: #f8fafc;
      margin-top: 32px;
    }
    article p {
      margin: 18px 0;
    }
    article a {
      color: #38bdf8;
      text-decoration: none;
    }
    article blockquote {
      margin: 24px 0;
      padding: 16px 24px;
      background: rgba(56, 189, 248, 0.08);
      border-left: 3px solid rgba(56, 189, 248, 0.6);
      border-radius: 8px;
      color: #bae6fd;
    }
    footer {
      margin-top: 48px;
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: center;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      background: rgba(15, 23, 42, 0.7);
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.95em;
    }
    pre code {
      display: block;
      padding: 18px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        ${url ? `<span>Source: <a href="${escapeAttribute(url)}">${escapeHtml(url)}</a></span>` : ''}
        <span>Exported: ${escapeHtml(timestamp)}</span>
      </div>
    </header>
    <article>
      ${html}
    </article>
    <footer>Generated by OmniBrowser Reader • ${escapeHtml(timestamp)}</footer>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\s+/g, '');
}

