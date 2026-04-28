/** Percent change from previous to current; used for dashboard trend chips. */
export function percentChange(previous: number, current: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function trendFromCounts(previous: number, current: number): {
  arrow: '↑' | '↓' | '—'
  pct: number | null
  label: string
} {
  const pct = percentChange(previous, current)
  if (pct === null) {
    if (current > 0 && previous === 0) return { arrow: '↑', pct: null, label: 'new' }
    return { arrow: '—', pct: null, label: '0%' }
  }
  if (pct === 0) return { arrow: '—', pct: 0, label: '0%' }
  return { arrow: pct > 0 ? '↑' : '↓', pct: Math.abs(pct), label: `${Math.abs(pct)}%` }
}

