import type { Application } from '../../api/applications'

export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

/** Ordered funnel stages for pipeline visualization */
export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
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

export function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

export function uniqueCandidateCount(applications: Application[]) {
  return new Set(applications.map(a => a.candidate_email.toLowerCase())).size
}

function countInRange(applications: Application[], startMs: number, endMs: number) {
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

function uniqueInRange(applications: Application[], startMs: number, endMs: number) {
  const slice = applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= startMs && t < endMs
  })
  return new Set(slice.map(a => a.candidate_email.toLowerCase())).size
}

export type TrendParts = {
  arrow: '↑' | '↓' | '—'
  pctLabel: string
  positive: boolean
}

/** Percent change from previous to current window; `positive` means upward movement is good for the metric. */
export function trendParts(current: number, previous: number, positive = true): TrendParts {
  if (previous === 0 && current === 0) {
    return { arrow: '—', pctLabel: '0%', positive }
  }
  if (previous === 0) {
    return { arrow: '↑', pctLabel: '+100%', positive }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const clamped = Math.min(999, Math.max(-999, raw))
  const arrow = clamped > 0 ? '↑' : clamped < 0 ? '↓' : '—'
  const pctLabel = `${clamped > 0 ? '+' : ''}${clamped}%`
  const isUp = clamped > 0
  const good = positive ? isUp : !isUp
  return { arrow, pctLabel, positive: good }
}

export function applicationWindows(applications: Application[], atMs: number) {
  const now = atMs
  const d30 = 30 * 24 * 60 * 60 * 1000
  const curStart = now - d30
  const prevStart = now - 2 * d30
  const prevEnd = now - d30
  return {
    last30unique: uniqueInRange(applications, curStart, now),
    prev30unique: uniqueInRange(applications, prevStart, prevEnd),
    last30apps: countInRange(applications, curStart, now),
    prev30apps: countInRange(applications, prevStart, prevEnd),
  }
}

export function offersInWindow(applications: Application[], startMs: number, endMs: number) {
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= startMs && t < endMs
  }).length
}
