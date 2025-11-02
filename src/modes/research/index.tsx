import { useState } from 'react';
import { MockResearchProvider, TinyLLMProvider } from './provider';
import { useSettingsStore } from '../../state/settingsStore';
import VoiceButton from '../../components/VoiceButton';

export default function ResearchPanel() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ title: string; url: string }[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const live = useSettingsStore(()=> false); // replace with real toggle if desired
  const provider = live ? new TinyLLMProvider() : new MockResearchProvider();
  return (
    <div className="p-3 space-y-2">
      <form onSubmit={async (e) => { e.preventDefault(); const liveRes = await (window as any).research?.query?.(q); setAnswer(liveRes?.answer || ''); const r = await provider.search(q); setResults(r); }} className="flex items-center gap-2">
        <input className="w-full bg-neutral-800 rounded px-3 py-2 text-sm" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ask a question..." />
        <VoiceButton onResult={(t)=>{ setQ(t); }} small />
      </form>
      {answer && (
        <div className="border border-neutral-800 rounded p-3 text-sm whitespace-pre-wrap">{answer}</div>
      )}
      <ul className="space-y-1">
        {results.map((r)=> (
          <li key={r.url} className="text-sm">
            <a className="text-indigo-400" href={r.url} onClick={(e)=>{ e.preventDefault(); window.api?.tabs?.navigate?.('active', r.url); }}>{r.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}


