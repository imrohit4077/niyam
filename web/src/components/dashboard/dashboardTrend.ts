/** Compare items whose date falls in [start, end) vs previous window of equal length. */
export function countInDateRange<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  windowEnd: Date,
  windowDays: number,
): { current: number; previous: number } {
  const ms = windowDays * 24 * 60 * 60 * 1000
  const curStart = new Date(windowEnd.getTime() - ms)
  const prevStart = new Date(curStart.getTime() - ms)

  let current = 0
  let previous = 0
  for (const item of items) {
    const d = getDate(item)
    if (!d || Number.isNaN(d.getTime())) continue
    const t = d.getTime()
    if (t >= curStart.getTime() && t < windowEnd.getTime()) current += 1
    else if (t >= prevStart.getTime() && t < curStart.getTime()) previous += 1
  }
  return { current, previous }
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendPercent(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (current === previous) return { pct: 0, direction: 'flat' }
  if (previous === 0) {
    return current > 0 ? { pct: 100, direction: 'up' } : { pct: 0, direction: 'flat' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const pct = Math.min(999, Math.abs(raw))
  return {
    pct,
    direction: raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat',
  }
}
