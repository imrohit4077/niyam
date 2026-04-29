import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

/** Canonical pipeline stages for funnel visualization */
export const PIPELINE_FUNNEL_KEYS = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type PipelineFunnelKey = (typeof PIPELINE_FUNNEL_KEYS)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

/** Chart slice builder — drops zero values for cleaner doughnuts. */
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

export type TrendResult = {
  direction: TrendDirection
  /** Percentage point change, or null when not meaningful */
  percent: number | null
}

/**
 * Month-over-month style comparison: (current - previous) / previous * 100.
 * When previous is 0 and current > 0, reports 100% up.
 */
export function percentChange(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: 'up', percent: 100 }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  if (Math.abs(rounded) < 0.05) return { direction: 'flat', percent: 0 }
  return {
    direction: rounded > 0 ? 'up' : 'down',
    percent: Math.abs(rounded),
  }
}

export function formatTrendArrow(t: TrendResult): string {
  if (t.percent === null) return '—'
  if (t.direction === 'flat') return '→'
  return t.direction === 'up' ? '↑' : '↓'
}

export function formatTrendPercent(t: TrendResult): string {
  if (t.percent === null) return '—'
  if (t.direction === 'flat') return '0%'
  const sign = t.direction === 'up' ? '+' : '−'
  return `${sign}${t.percent.toFixed(t.percent >= 10 ? 0 : 1)}%`
}

export function countPipelineFunnel(applications: Application[]): Record<PipelineFunnelKey, number> {
  const counts: Record<PipelineFunnelKey, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const key = app.status as string
    if (key in counts) counts[key as PipelineFunnelKey] += 1
  }
  return counts
}

export function applicationFeedTitle(app: Application): string {
  switch (app.status) {
    case 'hired':
      return 'Candidate hired'
    case 'offer':
      return 'Offer stage'
    case 'interview':
      return 'In interview'
    case 'screening':
      return 'In screening'
    case 'rejected':
      return 'Application rejected'
    case 'withdrawn':
      return 'Application withdrawn'
    case 'applied':
    default:
      return 'Application activity'
  }
}

export type DashboardFeedItem = {
  id: string
  sortTime: number
  title: string
  meta: string
  /** ISO timestamp for display */
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): DashboardFeedItem[] {
  const items: DashboardFeedItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    items.push({
      id: `app-${app.id}`,
      sortTime: new Date(app.updated_at).getTime(),
      title: applicationFeedTitle(app),
      meta: name,
      at: app.updated_at,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    const stamp = row.scheduled_at || row.updated_at
    items.push({
      id: `iv-${row.id}`,
      sortTime: new Date(stamp).getTime(),
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview update',
      meta: `${name} · ${jobTitle}`,
      at: stamp,
    })
  }

  return items.sort((a, b) => b.sortTime - a.sortTime).slice(0, limit)
}

export function formatFeedTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Month offset 0 = current calendar month, 1 = previous, etc. */
export function countApplicationsCreatedInMonthOffset(
  applications: Application[],
  monthOffset: number,
): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  let n = 0
  for (const app of applications) {
    const d = new Date(app.created_at)
    if (d.getFullYear() === y && d.getMonth() === m) n += 1
  }
  return n
}

export function countJobsCreatedInMonthOffset<T extends { created_at: string }>(
  jobs: T[],
  monthOffset: number,
): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  let n = 0
  for (const job of jobs) {
    const d = new Date(job.created_at)
    if (d.getFullYear() === y && d.getMonth() === m) n += 1
  }
  return n
}

export function countInterviewsScheduledInMonthOffset(
  rows: InterviewAssignmentRow[],
  monthOffset: number,
): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  let n = 0
  for (const row of rows) {
    if (!row.scheduled_at) continue
    const d = new Date(row.scheduled_at)
    if (d.getFullYear() === y && d.getMonth() === m) n += 1
  }
  return n
}

export function countOffersInMonthOffset(applications: Application[], monthOffset: number): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const y = target.getFullYear()
  const m = target.getMonth()
  let n = 0
  for (const app of applications) {
    if (app.status !== 'offer') continue
    const d = new Date(app.updated_at)
    if (d.getFullYear() === y && d.getMonth() === m) n += 1
  }
  return n
}
