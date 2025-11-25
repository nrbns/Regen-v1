import { buildSearchUrl } from './search';
import { openWithAccount } from '../components/AccountBadge';
import { useSettingsStore } from '../state/settingsStore';

export async function runAutomationsFromUtterance(utterance: string) {
  const text = (utterance || '').trim();
  if (!text) return;
  const select = document.querySelector(
    'select.bg-neutral-800.rounded.px-2.py-1.text-xs'
  ) as HTMLSelectElement | null;
  const accountId = select?.value || 'default';
  // Get language from store (note: this is a utility function, so we access store directly)
  const language = useSettingsStore.getState().language || 'auto';

  // Patterns
  const mOpen = text.match(/^open\s+(.+)$/i);
  if (mOpen) {
    const target = mOpen[1].trim();
    const url = guessUrl(target);
    await openWithAccount(url, accountId);
    return;
  }

  const mSearch = text.match(/^(search\s+for|google|bing|duckduckgo|yahoo)\s+(.+)$/i);
  if (mSearch) {
    const engineAlias = (mSearch[1] || '').toLowerCase();
    const q = mSearch[2];
    const engine: any = engineAlias.includes('bing')
      ? 'bing'
      : engineAlias.includes('duck')
        ? 'duckduckgo'
        : engineAlias.includes('yahoo')
          ? 'yahoo'
          : 'google';
    const url = buildSearchUrl(engine, q, language !== 'auto' ? language : undefined);
    await openWithAccount(url, accountId);
    return;
  }

  const mVideo = text.match(/^(download\s+video|save\s+video)\s+(.+)$/i);
  if (mVideo) {
    const url = guessUrl(mVideo[2]);
    const ok = await (window as any).api?.video?.start?.({ url });
    if (!ok?.ok) alert(ok?.error || 'Video download failed');
    return;
  }

  // Fallback: research then open top result
  const res = await (window as any).research?.query?.(text);
  const top = res?.citations?.[0]?.url;
  if (top) await openWithAccount(top, accountId);
}

function guessUrl(input: string) {
  const s = input.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/\.[a-z]{2,}$/i.test(s)) return 'https://' + s;
  // Get language for guessUrl (called from runAutomationsFromUtterance which has language)
  const language = useSettingsStore.getState().language || 'auto';
  return buildSearchUrl('google', s, language !== 'auto' ? language : undefined);
}
