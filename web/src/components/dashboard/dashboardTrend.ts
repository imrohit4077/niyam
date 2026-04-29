export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  label: string
}

/** Month is 0-indexed (Date.getMonth()). */
export function countInCalendarMonth<T>(items: readonly T[], getDate: (item: T) => string | null | undefined, year: number, month: number): number {
  const start = new Date(year, month, 1).getTime()
  const end = new Date(year, month + 1, 1).getTime()
  let n = 0
  for (const item of items) {
    const raw = getDate(item)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= start && t < end) n += 1
  }
  return n
}

/**
 * Build a short trend label from current vs previous period counts.
 * Uses percent change when both periods are meaningful; otherwise copy counts.
 */
export function trendFromCounts(current: number, previous: number): TrendResult {
  if (current === previous) {
    return { direction: 'flat', label: '0% vs prior month' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', label: `+${current} vs prior month` }
  }
  if (previous === 0 && current === 0) {
    return { direction: 'flat', label: 'No prior data' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { direction, label: `${sign}${pct}% vs prior month` }
}
