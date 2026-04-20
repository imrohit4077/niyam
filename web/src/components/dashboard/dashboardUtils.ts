import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function computePeriodTrend(current: number, previous: number): {
  direction: TrendDirection
  percent: number | null
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', percent: 0, label: '0%' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', percent: null, label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, percent: rounded, label: `${sign}${rounded}%` }
}

export function workspaceFunnelCounts(applications: Application[]): {
  applied: number
  screening: number
  interview: number
  offer: number
  hired: number
} {
  const base = { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 }
  for (const app of applications) {
    const s = app.status
    if (s === 'applied') base.applied += 1
    else if (s === 'screening') base.screening += 1
    else if (s === 'interview') base.interview += 1
    else if (s === 'offer') base.offer += 1
    else if (s === 'hired') base.hired += 1
  }
  return base
}

export function countApplicationsInRange(
  applications: Application[],
  start: Date,
  end: Date,
  predicate?: (app: Application) => boolean,
) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    if (t < t0 || t >= t1) return false
    return predicate ? predicate(app) : true
  }).length
}

export function countOffersInRange(applications: Application[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(app => {
    if (app.status !== 'offer') return false
    const t = new Date(app.updated_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return rows.filter(row => {
    if (row.status !== 'scheduled' && row.status !== 'pending') return false
    const at = row.scheduled_at ? new Date(row.scheduled_at).getTime() : new Date(row.created_at).getTime()
    return at >= t0 && at < t1
  }).length
}

export function countNewOpenJobsInRange(jobs: Job[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return jobs.filter(job => {
    if (job.status !== 'open') return false
    const t = new Date(job.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function applicantsPerJob(applications: Application[], jobs: Job[]) {
  const byJob = applications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs
    .map(job => ({
      job,
      count: byJob[job.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function dominantApplicantStageForJob(applications: Application[], jobId: number): string | null {
  const counts: Record<string, number> = {}
  for (const app of applications) {
    if (app.job_id !== jobId) continue
    counts[app.status] = (counts[app.status] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export type ActivityKind = 'application' | 'interview' | 'stage'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 14,
): ActivityFeedItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityFeedItem[] = applications.map(app => ({
    id: `app-${app.id}`,
    kind: 'application' as const,
    title: `Application from ${app.candidate_name?.trim() || app.candidate_email}`,
    subtitle: `Applied to ${jobTitle(app.job_id)}`,
    at: app.created_at,
  }))

  const fromInterviews: ActivityFeedItem[] = interviews.map(row => {
    const jid = row.application?.job_id
    const role =
      row.job?.title ?? (jid != null ? jobTitle(jid) : 'Role')
    return {
      id: `int-${row.id}`,
      kind: 'interview' as const,
      title: `Interview ${formatDashboardLabel(row.status)}`,
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${role}`,
      at: row.scheduled_at || row.updated_at || row.created_at,
    }
  })

  const fromStages: ActivityFeedItem[] = []
  for (const app of applications) {
    const history = app.stage_history
    if (!history?.length) continue
    const last = history[history.length - 1]
    fromStages.push({
      id: `stage-${app.id}-${last.changed_at}`,
      kind: 'stage',
      title: `Stage → ${formatDashboardLabel(last.stage)}`,
      subtitle: `${app.candidate_name?.trim() || app.candidate_email} · ${jobTitle(app.job_id)}`,
      at: last.changed_at,
    })
  }

  return [...fromApps, ...fromInterviews, ...fromStages]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
