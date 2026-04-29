/**
 * Client-side "trend" helpers for dashboard cards — week-over-week comparison
 * from entity timestamps (no server-side timeseries).
 */
export function getTwoWeekRanges() {
  const now = new Date()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const tEnd = now.getTime()
  const tStart = tEnd - weekMs
  const pEnd = tStart
  const pStart = tStart - weekMs
  return { tStart, tEnd, pStart, pEnd }
}

export function inRange(ts: string | null | undefined, a: number, b: number) {
  if (!ts) return false
  const t = new Date(ts).getTime()
  return t >= a && t <= b
}

export function formatDeltaPct(thisCount: number, previousCount: number) {
  if (previousCount === 0) {
    if (thisCount === 0) return { arrow: '—' as const, label: '0%', tone: 'neutral' as const }
    return { arrow: '↑' as const, label: 'New', tone: 'up' as const }
  }
  const pct = Math.round(((thisCount - previousCount) / previousCount) * 100)
  if (pct === 0) return { arrow: '→' as const, label: '0%', tone: 'neutral' as const }
  if (pct > 0) return { arrow: '↑' as const, label: `+${pct}%`, tone: 'up' as const }
  return { arrow: '↓' as const, label: `${pct}%`, tone: 'down' as const }
}

export function countInRange<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  from: number,
  to: number,
) {
  return rows.filter(r => {
    const d = getDate(r)
    if (!d) return false
    const t = new Date(d).getTime()
    return t >= from && t <= to
  }).length
}
