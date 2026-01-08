import { useEffect, useState } from 'react';

export default function VideoPage() {
  const [url, setUrl] = useState('');
  const [log, setLog] = useState<string>('');
  useEffect(() => {
    const onProg = (_e: any, line: string) => setLog(prev => prev + line);
    (window as any).api?.video?.onProgress?.(onProg);
    return () => {};
  }, []);
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">Video Download</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded bg-neutral-800 px-2 py-1 text-sm"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste video URL (You must have rights)"
        />
        <button
          className="rounded bg-indigo-600 px-3 py-1 text-white"
          onClick={async () => {
            const ok = await (window as any).api?.video?.start?.({ url });
            if (!ok?.ok) alert(ok?.error || 'Error');
          }}
        >
          Start
        </button>
      </div>
      <pre className="h-64 overflow-auto rounded bg-neutral-900 p-2 text-xs">
        {log || 'Waiting…'}
      </pre>
    </div>
  );
}
