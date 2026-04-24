import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

/** Ordered pipeline stages for funnel visualization */
export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStatus = (typeof PIPELINE_FUNNEL_STATUSES)[number]

export const PIPELINE_FUNNEL_LABELS: Record<PipelineFunnelStatus, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Percentage point change vs previous period (rounded). */
  pct: number
  /** Human-readable label, e.g. "+12%" or "New" */
  label: string
}

/**
 * Compares count in current window vs previous window of equal length.
 * Both windows end at `now` (current is last `windowDays`, previous is the `windowDays` before that).
 */
export function trendFromCounts(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', pct: 100, label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw)
  if (pct > 0) return { direction: 'up', pct, label: `+${pct}%` }
  if (pct < 0) return { direction: 'down', pct, label: `${pct}%` }
  return { direction: 'flat', pct: 0, label: '0%' }
}

export function countApplicationsCreatedBetween(
  applications: Application[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countJobsCreatedBetween(jobs: Job[], start: Date, end: Date): number {
  const a = start.getTime()
  const b = end.getTime()
  return jobs.filter(job => {
    const t = new Date(job.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countByUpdatedStatusBetween(
  applications: Application[],
  status: string,
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    if (app.status !== status) return false
    const t = new Date(app.updated_at).getTime()
    return t >= a && t < b
  }).length
}

/** Interviews that look "scheduled" for momentum (created_at in window). */
export function countInterviewAssignmentsCreatedBetween<T extends { created_at: string }>(
  rows: T[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const t = new Date(row.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function rollingWindows(windowDays = 30): { currentStart: Date; currentEnd: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date()
  const currentEnd = now
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - windowDays)
  const prevEnd = currentStart
  const prevStart = new Date(currentStart)
  prevStart.setDate(prevStart.getDate() - windowDays)
  return { currentStart, currentEnd, prevStart, prevEnd }
}

export function aggregateApplicationsByJob(
  applications: Application[],
  jobs: Job[],
): { jobId: number; title: string; count: number }[] {
  const titleById = new Map(jobs.map(j => [j.id, j.title]))
  const counts = new Map<number, number>()
  for (const app of applications) {
    counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([jobId, count]) => ({
      jobId,
      title: titleById.get(jobId) ?? `Job #${jobId}`,
      count,
    }))
    .sort((x, y) => y.count - x.count)
}

export function topStageLabelForJob(jobId: number, applications: Application[]): string {
  const jobApps = applications.filter(a => a.job_id === jobId)
  if (jobApps.length === 0) return '—'
  const tally = new Map<string, number>()
  for (const a of jobApps) {
    tally.set(a.status, (tally.get(a.status) ?? 0) + 1)
  }
  let best = ''
  let bestN = 0
  for (const [status, n] of tally) {
    if (n > bestN) {
      best = status
      bestN = n
    }
  }
  return formatActivityLabel(best)
}

export function formatActivityLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type ActivityFeedItem = {
  id: string
  title: string
  subtitle: string
  meta: string
  tone: 'default' | 'success' | 'warning'
}

export function buildActivityFeed(applications: Application[], jobs: Job[], limit = 14): ActivityFeedItem[] {
  const titleById = new Map(jobs.map(j => [j.id, j.title]))
  const sorted = [...applications].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
  const out: ActivityFeedItem[] = []
  for (const app of sorted.slice(0, limit)) {
    const jobTitle = titleById.get(app.job_id) ?? `Job #${app.job_id}`
    const name = app.candidate_name?.trim() || app.candidate_email
    const { title, tone } = activityVerbForStatus(app.status)
    out.push({
      id: `app-${app.id}-${app.updated_at}`,
      title,
      subtitle: `${name} · ${jobTitle}`,
      meta: new Date(app.updated_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      tone,
    })
  }
  return out
}

function activityVerbForStatus(status: string): { title: string; tone: ActivityFeedItem['tone'] } {
  switch (status) {
    case 'hired':
      return { title: 'Candidate hired', tone: 'success' }
    case 'offer':
      return { title: 'Offer released', tone: 'success' }
    case 'interview':
      return { title: 'Interview stage', tone: 'default' }
    case 'screening':
      return { title: 'Screening', tone: 'default' }
    case 'applied':
      return { title: 'New application', tone: 'default' }
    case 'rejected':
      return { title: 'Application rejected', tone: 'warning' }
    case 'withdrawn':
      return { title: 'Application withdrawn', tone: 'warning' }
    default:
      return { title: `Application · ${formatActivityLabel(status)}`, tone: 'default' }
  }
}
