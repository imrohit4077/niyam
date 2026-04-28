import { DASHBOARD_CHART_COLORS } from './dashboardConstants'

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

const DAY_MS = 86400000

export type PeriodWindow = { start: number; end: number }

/** Last `days` vs the `days` before that (non-overlapping). */
export function trailingPeriodPair(days: number, nowMs: number = Date.now()): { current: PeriodWindow; previous: PeriodWindow } {
  const end = nowMs
  const curStart = end - days * DAY_MS
  const prevEnd = curStart
  const prevStart = prevEnd - days * DAY_MS
  return {
    current: { start: curStart, end },
    previous: { start: prevStart, end: prevEnd },
  }
}

export function countApplicationsInWindow(
  createdAts: Array<string | undefined>,
  window: PeriodWindow,
): number {
  return createdAts.filter(ts => {
    if (!ts) return false
    const t = new Date(ts).getTime()
    return t >= window.start && t < window.end
  }).length
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatTrendPercent(change: number | null): string {
  if (change === null) return '—'
  const sign = change > 0 ? '+' : ''
  return `${sign}${change}%`
}
