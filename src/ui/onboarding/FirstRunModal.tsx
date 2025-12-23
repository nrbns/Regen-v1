import React from 'react'

export default function FirstRunModal({ onClose, onEnableLowRam }: { onClose: () => void; onEnableLowRam: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] max-w-[92vw] rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Welcome β€" we save your memory automatically</h2>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-400">OmniBrowser hibernates inactive tabs and optimizes performance. No setup required.</p>
        <div className="mt-3.5 grid gap-2.5">
          <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-2.5">
            <div className="text-[13px] font-semibold text-green-300">Enabled by default</div>
            <div className="text-[11px] leading-relaxed text-green-400/90">Tab Hibernation and Battery-Aware mode work automatically</div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 p-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-200">Low-RAM Mode</div>
              <div className="text-[11px] leading-relaxed text-slate-400">Optimizes further for limited-memory devices</div>
            </div>
            <button
              className="ml-3 rounded px-2.5 py-1 text-[13px] font-semibold text-slate-100 bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
              onClick={() => onEnableLowRam()}
            >
              Turn On
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded px-2.5 py-1 text-[13px] font-medium text-slate-300 hover:bg-slate-800 transition-colors" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
  )
}
