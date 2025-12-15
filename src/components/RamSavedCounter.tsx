import React, { useEffect, useState } from 'react'

type RamSavedCounterProps = {
  pollMs?: number
  variant?: 'pill' | 'inline'
}

// Simple RAM saved counter component
// Tracks cumulative memory savings reported by telemetry or tab store
// Usage: include in header/status bar to show: "Saved XX MB"
export default function RamSavedCounter({ pollMs = 5000, variant = 'pill' }: RamSavedCounterProps) {
  const [todaySavedMb, setTodaySavedMb] = useState<number>(0)

  useEffect(() => {
    const key = 'omnibrowser:ram-saved-today'
    const load = () => {
      try {
        const raw = localStorage.getItem(key)
        const v = raw ? JSON.parse(raw) : { date: new Date().toDateString(), mb: 0 }
        // reset if day changed
        if (v.date !== new Date().toDateString()) {
          localStorage.setItem(key, JSON.stringify({ date: new Date().toDateString(), mb: 0 }))
          setTodaySavedMb(0)
        } else {
          setTodaySavedMb(Number(v.mb) || 0)
        }
      } catch {
        setTodaySavedMb(0)
      }
    }
    load()
    const id = setInterval(load, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  useEffect(() => {
    // listen for custom events when tabs hibernate/wake
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mb?: number }
      const inc = Math.max(0, Math.round(detail?.mb || 0))
      const key = 'omnibrowser:ram-saved-today'
      try {
        const raw = localStorage.getItem(key)
        const v = raw ? JSON.parse(raw) : { date: new Date().toDateString(), mb: 0 }
        const today = v.date === new Date().toDateString() ? v.mb : 0
        const next = { date: new Date().toDateString(), mb: Math.round((today || 0) + inc) }
        localStorage.setItem(key, JSON.stringify(next))
        setTodaySavedMb(next.mb)
      } catch {
        // ignore
      }
    }
    window.addEventListener('omnibrowser:ram_saved', onSaved as EventListener)
    return () => window.removeEventListener('omnibrowser:ram_saved', onSaved as EventListener)
  }, [])

  const handleShare = () => {
    const msg = `This browser saved me ${todaySavedMb}MB RAM today.`
    navigator.clipboard?.writeText(msg)
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-100">
        <span className="text-[11px] uppercase tracking-wide text-gray-400">Saved</span>
        <span className="tabular-nums font-semibold text-emerald-400">{todaySavedMb} MB</span>
        <button
          className="rounded border border-gray-700/70 px-2 py-0.5 text-[11px] text-gray-300 transition hover:border-gray-600 hover:bg-gray-800"
          onClick={handleShare}
          title="Copy to clipboard"
        >
          Share
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-800/70 px-2.5 py-1 text-xs text-gray-200 shadow-sm">
      <span className="font-semibold tracking-tight">RAM</span>
      <span className="tabular-nums font-bold text-emerald-400">{todaySavedMb}</span>
      <span className="text-[10px] text-gray-400">MB</span>
      <button
        className="ml-1 rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        onClick={handleShare}
        title="Copy to clipboard"
      >
        Share
      </button>
    </div>
  )
}
