import { useState } from 'react';
import { useSettingsStore } from '../state/settingsStore';
import { normalizeInputToUrlOrSearch, buildSearchUrl } from '../lib/search';
import { openWithAccount } from './AccountBadge';
import VoiceButton from './VoiceButton';

export default function OmniSearch() {
  const [q, setQ] = useState('');
  const engine = useSettingsStore(s => s.searchEngine);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    // Prefer creating in selected account profile for isolation
    const select = document.querySelector('select.bg-neutral-800.rounded.px-2.py-1.text-xs') as HTMLSelectElement | null;
    const accountId = select?.value || 'default';
    if (engine === 'all') {
      const providers: any[] = ['google','bing','duckduckgo','yahoo'];
      for (const p of providers) {
        const url = buildSearchUrl(p as any, q);
        openWithAccount(url, accountId);
      }
    } else {
      const target = normalizeInputToUrlOrSearch(q, engine as any) as string;
      openWithAccount(target, accountId);
    }
  };
  return (
    <form onSubmit={onSubmit} className="flex-1 flex items-center">
      <input
        className="w-full bg-neutral-800 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
        placeholder="Type a URL or query"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const host = q.trim();
            if (!host) return;
            const hasScheme = /^https?:\/\//i.test(host);
            const hasTld = /\.[a-z]{2,}$/i.test(host);
            const url = (hasScheme || hasTld) ? host : `https://${host}.com`;
            const select = document.querySelector('select.bg-neutral-800.rounded.px-2.py-1.text-xs') as HTMLSelectElement | null;
            const accountId = select?.value || 'default';
            openWithAccount(url, accountId);
          }
        }}
      />
      <VoiceButton onResult={(text)=>{ setQ(text); setTimeout(()=> onSubmit(new Event('submit') as any), 0); }} small />
    </form>
  );
}


