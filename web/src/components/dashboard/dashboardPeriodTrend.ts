/** Compare two trailing windows (e.g. last 30 days vs prior 30 days) for dashboard KPI trends. */

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  direction: TrendDirection
  pct: number
  current: number
  previous: number
}

export function countInRange<T>(items: T[], getDate: (item: T) => string | null | undefined, start: Date, end: Date): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

export function trendFromCounts(current: number, previous: number): PeriodTrend {
  if (current === 0 && previous === 0) {
    return { direction: 'flat', pct: 0, current: 0, previous: 0 }
  }
  if (previous === 0) {
    return { direction: current > 0 ? 'up' : 'flat', pct: current > 0 ? 100 : 0, current, previous }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw) >= 100 ? Math.sign(raw) * 100 : raw)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return { direction, pct: Math.abs(pct), current, previous }
}

export function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}
