import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'
import { DASHBOARD_CHART_COLORS, FUNNEL_STATUSES } from './dashboardConstants'

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

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeDay(value: string) {
  const d = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / (86400 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendResult = {
  direction: 'up' | 'down' | 'flat'
  percent: number
  caption: string
}

/** Percent change vs previous period; `flat` when both zero. */
export function comparePeriods(current: number, previous: number): TrendResult {
  if (current === 0 && previous === 0) {
    return { direction: 'flat', percent: 0, caption: 'vs prior 30 days' }
  }
  if (previous === 0) {
    return { direction: 'up', percent: 100, caption: 'vs prior 30 days' }
  }
  const raw = ((current - previous) / previous) * 100
  const percent = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', percent, caption: 'vs prior 30 days' }
  if (raw < -0.5) return { direction: 'down', percent, caption: 'vs prior 30 days' }
  return { direction: 'flat', percent: 0, caption: 'vs prior 30 days' }
}

/** Last 30 days vs previous 30 days window (by calendar day in local TZ). */
export function countAppsCreatedInRollingWindow(apps: Application[], lastDays: number, beforeThatDays: number) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const a = new Date(now)
  a.setDate(a.getDate() - lastDays)
  const b = new Date(now)
  b.setDate(b.getDate() - lastDays - beforeThatDays)
  const current = apps.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a.getTime() && t <= now.getTime()
  }).length
  const previous = apps.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= b.getTime() && t < a.getTime()
  }).length
  return { current, previous }
}

export function countByCreatedAt<T>(items: T[], getCreatedAt: (row: T) => string, lastDays: number, beforeThatDays: number) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const a = new Date(now)
  a.setDate(a.getDate() - lastDays)
  const b = new Date(now)
  b.setDate(b.getDate() - lastDays - beforeThatDays)
  const current = items.filter(row => {
    const t = new Date(getCreatedAt(row)).getTime()
    return t >= a.getTime() && t <= now.getTime()
  }).length
  const previous = items.filter(row => {
    const t = new Date(getCreatedAt(row)).getTime()
    return t >= b.getTime() && t < a.getTime()
  }).length
  return { current, previous }
}

export function countOffersTouchedInWindow(apps: Application[], lastDays: number, beforeThatDays: number) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const a = new Date(now)
  a.setDate(a.getDate() - lastDays)
  const b = new Date(now)
  b.setDate(b.getDate() - lastDays - beforeThatDays)
  const inOffer = (app: Application) => app.status === 'offer'
  const current = apps.filter(
    app => inOffer(app) && new Date(app.updated_at).getTime() >= a.getTime() && new Date(app.updated_at).getTime() <= now.getTime(),
  ).length
  const previous = apps.filter(
    app => inOffer(app) && new Date(app.updated_at).getTime() >= b.getTime() && new Date(app.updated_at).getTime() < a.getTime(),
  ).length
  return { current, previous }
}

export function funnelCountsFromApplications(apps: Application[]) {
  const byStatus = apps.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STATUSES.map(status => ({
    key: status,
    label: formatDashboardLabel(status),
    value: byStatus[status] ?? 0,
  }))
}

export function applicantsPerJob(jobs: Job[], apps: Application[], limit = 8) {
  const counts = new Map<number, number>()
  apps.forEach(app => {
    counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1)
  })
  return jobs
    .map(job => ({
      job,
      count: counts.get(job.id) ?? 0,
    }))
    .sort((x, y) => y.count - x.count)
    .slice(0, limit)
}

export type ActivityItem = {
  id: string
  at: string
  label: string
  meta: string
}

export function buildActivityFeed(
  jobs: Job[],
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityItem[] = apps.map(app => {
    const title = jobTitle(app.job_id)
    if (app.status === 'hired') {
      return {
        id: `app-hired-${app.id}`,
        at: app.updated_at,
        label: `${app.candidate_name || app.candidate_email} hired`,
        meta: title,
      }
    }
    if (app.status === 'offer') {
      return {
        id: `app-offer-${app.id}`,
        at: app.updated_at,
        label: `Offer stage · ${app.candidate_name || app.candidate_email}`,
        meta: title,
      }
    }
    return {
      id: `app-new-${app.id}`,
      at: app.created_at,
      label: `New application · ${app.candidate_name || app.candidate_email}`,
      meta: title,
    }
  })

  const fromInterviews: ActivityItem[] = interviews.map(row => ({
    id: `int-${row.id}`,
    at: row.scheduled_at || row.created_at,
    label: row.scheduled_at ? 'Interview scheduled' : 'Interview assignment',
    meta: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
  }))

  return [...fromApps, ...fromInterviews]
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit)
}

/** Most common pipeline stage among applicants for this job (funnel statuses only). */
export function dominantApplicantStage(apps: Application[], jobId: number): string | null {
  const forJob = apps.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return null
  const funnelSet = new Set<string>(FUNNEL_STATUSES)
  const counts = forJob.reduce<Record<string, number>>((acc, a) => {
    if (!funnelSet.has(a.status)) return acc
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let n = 0
  FUNNEL_STATUSES.forEach(status => {
    const v = counts[status] ?? 0
    if (v > n) {
      best = status
      n = v
    }
  })
  return n > 0 ? best : null
}
