export type TrendInfo = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

/** Month-over-month percentage change label for KPI trends. */
export function trendFromCounts(current: number, previous: number): TrendInfo {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0% vs prior month' }
  if (previous === 0) return { direction: 'up', label: `+${current} vs prior month` }
  const pct = Math.round(((current - previous) / previous) * 100)
  const sign = pct > 0 ? '+' : ''
  const direction: TrendInfo['direction'] = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return { direction, label: `${sign}${pct}% vs prior month` }
}

export function monthWindow(offsetFromCurrent: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - offsetFromCurrent
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function isDateInRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}
