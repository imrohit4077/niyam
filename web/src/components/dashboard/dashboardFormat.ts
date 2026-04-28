export type SummaryTrend = {
  arrow: '↑' | '↓' | '—'
  pctLabel: string
  caption: string
  tone: 'up' | 'down' | 'neutral'
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
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

/** Calendar month from ISO string (local), aligned with dashboard trend charts */
export function localMonthKey(iso: string) {
  const d = new Date(iso)
  return { y: d.getFullYear(), m: d.getMonth() }
}

type MonthCountable = {
  created_at?: string
  updated_at?: string
  scheduled_at?: string | null
}

export function countInLocalMonth(rows: MonthCountable[], field: keyof MonthCountable, y: number, m: number): number {
  return rows.filter(row => {
    const raw = row[field]
    if (typeof raw !== 'string' || !raw) return false
    const { y: ry, m: rm } = localMonthKey(raw)
    return ry === y && rm === m
  }).length
}

export function prevMonth(y: number, m: number) {
  if (m === 0) return { y: y - 1, m: 11 }
  return { y, m: m - 1 }
}

export function buildMomTrend(current: number, previous: number, caption: string): SummaryTrend {
  if (previous === 0 && current === 0) {
    return { arrow: '—', pctLabel: '0%', caption, tone: 'neutral' }
  }
  if (previous === 0 && current > 0) {
    return { arrow: '↑', pctLabel: 'New', caption, tone: 'up' }
  }
  const rawPct = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(rawPct))
  const up = current >= previous
  return {
    arrow: up ? '↑' : '↓',
    pctLabel: `${rounded}%`,
    caption,
    tone: up ? 'up' : 'down',
  }
}
