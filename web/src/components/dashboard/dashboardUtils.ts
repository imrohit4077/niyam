export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'flat'

/** Percent change vs prior period; returns null when not meaningful. */
export function percentChange(current: number, previous: number): { pct: number; direction: TrendDirection } | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) {
    if (current === 0) return null
    return { pct: 100, direction: 'up' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { pct, direction: 'up' }
  if (raw < -0.5) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function countInCalendarMonth<T extends { scheduled_at?: string | null }>(
  rows: T[],
  monthOffset: number,
  ref: Date = new Date(),
): number {
  const target = new Date(ref.getFullYear(), ref.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const d = new Date(row.scheduled_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function countApplicationsInMonth(
  applications: { status: string; updated_at: string }[],
  status: string,
  monthOffset: number,
  ref: Date = new Date(),
): number {
  const target = new Date(ref.getFullYear(), ref.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  return applications.filter(a => {
    if (a.status !== status) return false
    const d = new Date(a.updated_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}
