/** For KPI cards: current vs previous period. */
export function trendFromPeriods(current: number, previous: number): { pct: number; up: boolean; same: boolean } {
  if (current === previous) return { pct: 0, up: true, same: true }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, up: true, same: false }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { pct: Math.abs(pct), up: current >= previous, same: false }
}

export function formatTrendLabel(t: { pct: number; up: boolean; same: boolean }): { arrow: string; text: string; tone: 'positive' | 'negative' | 'neutral' } {
  if (t.same) return { arrow: '', text: '—', tone: 'neutral' }
  const arrow = t.up ? '↑' : '↓'
  return { arrow, text: `${t.pct}%`, tone: t.up ? 'positive' : 'negative' }
}
