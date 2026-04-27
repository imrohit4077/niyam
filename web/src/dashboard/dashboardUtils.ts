/** Shared formatting and analytics helpers for the home dashboard. */

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Funnel stages in pipeline order (subset of application statuses). */
export const PIPELINE_FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
]

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Human-readable, e.g. "+12%" or "0%" */
  label: string
  /** Numeric percent change when meaningful; null if not comparable */
  pct: number | null
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Compare count of items in the last calendar month vs the previous month. */
export function monthOverMonthTrend(
  items: { date: Date }[],
  now: Date = new Date(),
): TrendResult {
  const cur = new Date(now.getFullYear(), now.getMonth(), 1)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const curKey = monthKey(cur)
  const prevKey = monthKey(prev)

  let curCount = 0
  let prevCount = 0
  for (const { date } of items) {
    const k = monthKey(date)
    if (k === curKey) curCount += 1
    else if (k === prevKey) prevCount += 1
  }

  if (prevCount === 0 && curCount === 0) return { direction: 'flat', label: '0%', pct: 0 }
  if (prevCount === 0 && curCount > 0) return { direction: 'up', label: 'New', pct: null }
  const pct = Math.round(((curCount - prevCount) / prevCount) * 100)
  if (pct > 0) return { direction: 'up', label: `+${pct}%`, pct }
  if (pct < 0) return { direction: 'down', label: `${pct}%`, pct }
  return { direction: 'flat', label: '0%', pct: 0 }
}

export function formatTrendForCard(t: TrendResult): string {
  if (t.pct === null && t.direction === 'up') return '↑ new'
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'
  return `${arrow} ${t.label}`
}
