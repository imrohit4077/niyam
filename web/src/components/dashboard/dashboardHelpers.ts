import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const PIPELINE_FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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

export type TrendIndicator = {
  direction: TrendDirection
  /** Percent change vs comparison period; null when not meaningful */
  percent: number | null
  caption: string
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function buildTrend(current: number, previous: number, periodLabel: string): TrendIndicator {
  const pct = pctChange(current, previous)
  let direction: TrendDirection = 'flat'
  if (current > previous) direction = 'up'
  else if (current < previous) direction = 'down'
  return {
    direction,
    percent: pct === null ? (previous === 0 && current > 0 ? 100 : null) : Math.abs(pct),
    caption: periodLabel,
  }
}

export function countApplicationsCreatedBetween(
  applications: Application[],
  start: Date,
  end: Date,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function countJobsCreatedBetween(jobs: Job[], start: Date, end: Date): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function countInterviewAssignmentsBetween(
  rows: InterviewAssignmentRow[],
  start: Date,
  end: Date,
  mode: 'created' | 'scheduled',
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return rows.filter(row => {
    const raw = mode === 'created' ? row.created_at : row.scheduled_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

export function countOffersTouchedBetween(applications: Application[], start: Date, end: Date): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function pipelineFunnelCounts(applications: Application[]): number[] {
  return PIPELINE_FUNNEL_STAGES.map(stage => applications.filter(a => a.status === stage.key).length)
}

export function dominantApplicantStageForJob(jobId: number, applications: Application[]): string {
  const forJob = applications.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return '—'
  const byStatus: Record<string, number> = {}
  forJob.forEach(a => {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
  })
  let best = ''
  let bestN = -1
  Object.entries(byStatus).forEach(([status, n]) => {
    if (n > bestN) {
      bestN = n
      best = status
    }
  })
  return formatDashboardLabel(best)
}

export type ActivityFeedItem = {
  id: string
  at: string
  kind: 'application' | 'interview'
  title: string
  subtitle: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 12,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  applications.forEach(app => {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      kind: 'application',
      title: 'Candidate added',
      subtitle: `${name} · ${formatDashboardLabel(app.status)}`,
    })
    const history = app.stage_history
    if (history && history.length > 1) {
      const last = history[history.length - 1]
      const prev = history[history.length - 2]
      if (last && prev && last.stage !== prev.stage) {
        items.push({
          id: `app-stage-${app.id}-${last.changed_at}`,
          at: last.changed_at,
          kind: 'application',
          title: 'Stage updated',
          subtitle: `${name} · ${formatDashboardLabel(prev.stage)} → ${formatDashboardLabel(last.stage)}`,
        })
      }
    }
  })

  interviews.forEach(row => {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    if (row.scheduled_at) {
      items.push({
        id: `int-sched-${row.id}`,
        at: row.scheduled_at,
        kind: 'interview',
        title: 'Interview scheduled',
        subtitle: `${name} · ${jobTitle}`,
      })
    }
  })

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

export function formatActivityTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
