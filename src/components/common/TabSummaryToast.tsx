import React, { useEffect, useState } from 'react';

export function TabSummaryToast() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<{
    tabId: string;
    title: string;
    url: string;
    summary: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      if (!detail || !detail.summary) return;
      setPayload({
        tabId: detail.tabId,
        title: detail.title,
        url: detail.url,
        summary: detail.summary,
      });
      setOpen(true);
    };
    const errHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      setPayload({
        tabId: detail?.tabId ?? '',
        title: 'Summary failed',
        url: '',
        summary: String(detail?.error ?? 'Unknown error'),
      });
      setOpen(true);
    };
    window.addEventListener('omnibrowser:tab_summary', handler as EventListener);
    window.addEventListener('omnibrowser:tab_summary_error', errHandler as EventListener);
    return () => {
      window.removeEventListener('omnibrowser:tab_summary', handler as EventListener);
      window.removeEventListener('omnibrowser:tab_summary_error', errHandler as EventListener);
    };
  }, []);

  if (!open || !payload) return null;

  return (
    <div className="bg-slate-900/98 fixed bottom-6 right-6 z-[70] max-w-[480px] rounded-lg border border-slate-700 shadow-2xl backdrop-blur-sm">
      <div className="flex items-start gap-2.5 p-3.5">
        <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400 shadow-sm" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-tight text-slate-100">AI Summary</div>
          {payload.title && (
            <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400">
              {payload.title}
            </div>
          )}
          <div className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-200">
            {payload.summary}
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5">
            {payload.url && (
              <a
                href={payload.url}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700"
              >
                Open
              </a>
            )}
            <button
              className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-blue-500"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
