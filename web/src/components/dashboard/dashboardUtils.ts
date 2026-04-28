/** Compare two periods; returns delta count and percent change for display. */
export function periodTrend(current: number, previous: number): { delta: number; pct: number | null } {
  const delta = current - previous
  if (previous === 0) {
    return { delta, pct: current > 0 ? 100 : null }
  }
  return { delta, pct: Math.round((delta / previous) * 100) }
}

export function formatTrendPct(pct: number | null): string {
  if (pct === null) return '—'
  return `${pct > 0 ? '+' : ''}${pct}%`
}
