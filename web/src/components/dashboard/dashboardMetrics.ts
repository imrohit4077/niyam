/** Month boundaries in local time for simple period comparisons on the dashboard. */
export function monthBounds(offsetFromCurrent: number): { start: Date; end: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - offsetFromCurrent
  const start = new Date(y, m, 1, 0, 0, 0, 0)
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function isBetween(d: Date, start: Date, end: Date): boolean {
  return d >= start && d <= end
}

export type TrendParts = {
  arrow: '↑' | '↓' | '—'
  pctLabel: string
  caption: string
}

/** Percent change vs prior period; arrow reflects direction. */
export function trendVsPrior(current: number, previous: number, caption = 'vs prior month'): TrendParts {
  if (previous === 0 && current === 0) {
    return { arrow: '—', pctLabel: '0%', caption }
  }
  if (previous === 0) {
    return { arrow: '↑', pctLabel: 'new', caption }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  const arrow: TrendParts['arrow'] = raw > 0 ? '↑' : raw < 0 ? '↓' : '—'
  const pctLabel = `${rounded}%`
  return { arrow, pctLabel, caption }
}
